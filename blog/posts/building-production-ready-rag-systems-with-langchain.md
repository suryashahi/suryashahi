---
title: "Building Production-Ready RAG Systems with LangChain"
date: "2025-11-15"
category: "AI/ML"
readTime: "12 min read"
description: "A deep dive into building Retrieval-Augmented Generation systems that work in production — covering document chunking strategies, embedding models, vector databases, and evaluation techniques."
tags: ["RAG", "LangChain", "Vector Databases", "Production AI", "Python"]
heroImage: "blog-placeholder-1.webp"
---

# Building Production-Ready RAG Systems with LangChain

Retrieval-Augmented Generation (RAG) has become the go-to pattern for grounding LLMs in domain-specific knowledge. But moving from a working prototype to a production system that handles real traffic, stays accurate, and doesn't hallucinate requires careful architectural decisions. Here's what I learned building [InsightEngine](https://insightenginee.vercel.app/) — a multi-LLM RAG research assistant with OCR fallback, ingestion diagnostics, and vector-based retrieval.

## The RAG Pipeline Overview

A production RAG system isn't just "embed → retrieve → generate." It's a pipeline with multiple stages, each requiring tuning:

1. **Document Ingestion** — Multi-format parsing (PDF, DOCX, TXT, HTML) with OCR fallback for scanned documents
2. **Chunking Strategy** — Semantic vs. fixed-size, overlap handling, metadata preservation
3. **Embedding Generation** — Model selection, batching, caching, dimension optimization
4. **Vector Storage & Retrieval** — Index type (HNSW, IVF), hybrid search, reranking
5. **Generation** — Prompt engineering, citation handling, streaming responses
6. **Evaluation & Observability** — Groundedness, relevance, latency monitoring

## 1. Document Ingestion: Handle the Messy Reality

Real-world documents are messy. Scanned PDFs, corrupted encodings, tables, images — your ingestion pipeline needs to handle all of it gracefully.

### Multi-Format Parsing with Fallback

```python
# Python (FastAPI) - Ingestion endpoint
from fastapi import UploadFile, File
from langchain.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredHTMLLoader
)
import pytesseract
from pdf2image import convert_from_bytes
import io

async def process_document(file: UploadFile) -> List[Document]:
    content = await file.read()

    # Try native parsers first
    if file.filename.endswith('.pdf'):
        try:
            loader = PyPDFLoader(io.BytesIO(content))
            docs = loader.load()
            # Check if text extraction worked
            if not any(doc.page_content.strip() for doc in docs):
                raise ValueError("No text extracted - likely scanned PDF")
        except:
            # OCR fallback for scanned PDFs
            images = convert_from_bytes(content)
            text = ""
            for img in images:
                text += pytesseract.image_to_string(img)
            docs = [Document(page_content=text, metadata={"source": file.filename, "ocr": True})]
    # ... handle other formats

    return docs
```

**Key insight:** Always track which documents used OCR — they need manual review. I added an `ocr: true` metadata flag and built an ingestion dashboard showing success/failure rates per document.

## 2. Chunking: Semantic Beats Fixed-Size

Fixed-size chunking (e.g., 500 chars with 50 overlap) is easy but breaks semantic boundaries. A paragraph about "pricing" split across two chunks loses context.

### Better Approach: Recursive + Semantic Chunking

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_experimental.text_splitter import SemanticChunker
from langchain.embeddings import HuggingFaceEmbeddings

# Start with recursive (respects paragraphs, sentences)
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
    keep_separator=True
)

# For critical docs, use semantic chunking
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
semantic_splitter = SemanticChunker(embeddings, breakpoint_threshold_type="percentile")

def chunk_document(doc: Document) -> List[Document]:
    # Use semantic for important docs, recursive for bulk
    if doc.metadata.get("importance") == "high":
        chunks = semantic_splitter.split_documents([doc])
    else:
        chunks = recursive_splitter.split_documents([doc])

    # Preserve metadata + add chunk index
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "chunk_index": i,
            "total_chunks": len(chunks),
            "parent_id": doc.metadata.get("doc_id")
        })
    return chunks
```

**Production tip:** Store the parent document ID and chunk index. This enables "show more context" in the UI and helps with deduplication during re-indexing.

## 3. Embeddings: Model Selection Matters

Don't default to `text-embedding-ada-002`. For specialized domains (medical, legal, code), fine-tuned sentence transformers often outperform general models at a fraction of the cost.

| Model | Dimensions | Latency (ms) | Best For |
|-------|------------|--------------|----------|
| text-embedding-ada-002 | 1536 | ~100 (API) | General purpose, multilingual |
| all-MiniLM-L6-v2 | 384 | ~5 (local) | Fast prototyping, English |
| bge-large-en-v1.5 | 1024 | ~50 (local) | High-quality retrieval, English |
| e5-large-v2 | 1024 | ~60 (local) | Multilingual, strong benchmarks |
| nomic-embed-text | 768 | ~30 (local) | Long context (8k tokens), Apache 2.0 |

For InsightEngine, I used `bge-large-en-v1.5` locally (via `sentence-transformers`) for cost control and latency. Batch embeddings in chunks of 32 for throughput.

## 4. Vector Database: Choose Based on Scale

Your vector store choice depends on data volume and query patterns:

- **< 100k vectors:** ChromaDB (embedded), pgvector (if you already use Postgres)
- **100k - 10M:** Pinecone, Weaviate, Qdrant (managed)
- **> 10M:** Milvus, Elasticsearch with vector support

I used **Supabase (pgvector)** for InsightEngine — same database as auth + metadata, single connection pool, ACID transactions for metadata updates.

### Hybrid Search: Dense + Sparse

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(1024),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast ANN search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding VECTOR(1024),
    query_text TEXT,
    match_count INT DEFAULT 10,
    semantic_weight FLOAT DEFAULT 0.7,
    keyword_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    score FLOAT
) LANGUAGE sql AS $$
    SELECT
        d.id,
        d.content,
        d.metadata,
        (
            semantic_weight * (1 - (d.embedding <=> query_embedding)) +
            keyword_weight * ts_rank_cd(
                to_tsvector('english', d.content),
                plainto_tsquery('english', query_text)
            )
        ) AS score
    FROM documents d
    ORDER BY score DESC
    LIMIT match_count;
$$;
```

## 5. Reranking: The Secret Weapon

Vector search gives you ~20 candidates. A cross-encoder reranker (like `bge-reranker-large` or `ms-marco-MiniLM-L-6-v2`) reorders them by actual relevance to the query. This single step often improves answer quality more than any other optimization.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank(query: str, candidates: List[Document], top_k: int = 5) -> List[Document]:
    pairs = [(query, doc.page_content) for doc in candidates]
    scores = reranker.predict(pairs)

    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:top_k]]
```

## 6. Generation: Citations and Streaming

Production RAG needs citations — users must verify sources. Structure your prompt to enforce citation format:

```
RAG_PROMPT = """You are a helpful assistant. Answer the question using ONLY the provided context.

Context:
{context}

Rules:
1. Cite sources inline using [doc_id:chunk_index] format
2. If context is insufficient, say "I don't have enough information to answer this"
3. Be concise but comprehensive

Question: {question}

Answer:"""
```

Stream responses for better perceived latency. With FastAPI + LangChain:

```python
from fastapi.responses import StreamingResponse
from langchain.callbacks import AsyncIteratorCallbackHandler

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    callback = AsyncIteratorCallbackHandler()
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        streaming=True,
        callbacks=[callback],
        temperature=0.1
    )

    async def generate():
        # Retrieve + rerank
        docs = await retrieve_and_rerank(request.query)
        context = format_context(docs)

        # Stream generation
        task = asyncio.create_task(llm.ainvoke(RAG_PROMPT.format(context=context, question=request.query)))

        async for token in callback.aiter():
            yield f"data: {json.dumps({'token': token})}\n\n"

        # Send citations at end
        citations = [{"id": d.metadata["doc_id"], "chunk": d.metadata["chunk_index"], "text": d.page_content[:200]} for d in docs]
        yield f"data: {json.dumps({'citations': citations, 'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

## 7. Evaluation: Measure What Matters

You can't improve what you don't measure. Track these metrics:

- **Groundedness:** % of answer tokens attributable to retrieved context (use `langchain.evaluation` or custom)
- **Relevance:** Human-graded relevance of retrieved docs (sample 100 queries/week)
- **Answer Quality:** LLM-as-judge (GPT-4) comparing your answer to ground truth
- **Latency:** P50/P95 for retrieve + rerank + generate stages separately
- **Coverage:** % of queries where retriever finds ≥1 relevant doc

### Automated Evaluation Pipeline

```python
# eval_pipeline.py
from langchain.evaluation import load_evaluator
from datasets import load_dataset

# Load your test set (query, expected_answer, relevant_doc_ids)
test_set = load_dataset("my-org/rag-eval-set", split="test")

# Groundedness evaluator
groundedness = load_evaluator("groundedness", llm=ChatOpenAI(model="gpt-4o-mini"))

results = []
for example in test_set:
    answer = await rag_chain.ainvoke(example["query"])
    context = retrieve_context(example["query"])

    eval_result = await groundedness.aevaluate(
        prediction=answer,
        context=context
    )
    results.append({
        "query": example["query"],
        "groundedness_score": eval_result["score"],
        "passed": eval_result["score"] > 0.7
    })

print(f"Groundedness pass rate: {sum(r['passed'] for r in results) / len(results):.1%}")
```

## Production Checklist

Before launching your RAG system:

- ✅ Document ingestion handles PDF, DOCX, TXT, HTML with OCR fallback
- ✅ Chunking preserves semantic boundaries + metadata
- ✅ Embedding model benchmarked for your domain
- ✅ Vector DB chosen for scale + hybrid search enabled
- ✅ Reranker integrated (cross-encoder)
- ✅ Citations enforced in prompt + displayed in UI
- ✅ Streaming responses for perceived latency
- ✅ Evaluation pipeline running on CI/CD
- ✅ Observability: latency, error rates, groundedness logged
- ✅ Guardrails: PII detection, prompt injection prevention

## Conclusion

RAG in production is less about the LLM and more about the **retrieval pipeline**. Invest in ingestion quality, chunking strategy, and evaluation — the generation part is comparatively straightforward.

The InsightEngine project implements all of this: multi-format ingestion with Tesseract OCR, semantic chunking, pgvector + hybrid search, cross-encoder reranking, multi-LLM support (OpenAI, Anthropic, local), and ingestion diagnostics. [Check out the code](https://github.com/suryashahi/insightengine) or [try the live demo](https://insightenginee.vercel.app/).

---

*Next up: I'll cover deploying TensorFlow models to production (lessons from the Plant Disease Detection project) and building real-time features with Socket.IO. Subscribe to get notified!*