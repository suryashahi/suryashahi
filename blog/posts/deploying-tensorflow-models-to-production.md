---
title: "Deploying TensorFlow Models to Production: Lessons from Plant Disease Detection"
date: "2025-09-20"
category: "Computer Vision"
readTime: "11 min read"
description: "Real-world challenges and solutions when taking a CNN model from Jupyter notebook to a scalable web service — model optimization, ONNX conversion, and edge deployment."
tags: ["TensorFlow", "Computer Vision", "ONNX", "Production", "Edge Deployment", "Model Optimization"]
heroImage: "blog-placeholder-3.webp"
---

# Deploying TensorFlow Models to Production: Lessons from Plant Disease Detection

Training a model in a Jupyter notebook is the easy part. Turning that `.h5` or `SavedModel` into a production service that handles real traffic, works offline on mobile, and doesn't cost a fortune — that's where the real engineering happens. Here's what I learned deploying the [Plant Disease Detection](https://github.com/suryashahi/plant-disease-detection) model (38-class CNN, 94% accuracy) from notebook to web and mobile.

## The Gap Between Notebook and Production

In the notebook, you have: infinite memory, no latency requirements, Python environment, GPU available.

In production, you have: memory limits, <100ms latency budgets, possibly no GPU, multiple runtimes (Node.js, browser, mobile), and the model must be versioned and monitored.

## 1. Model Optimization: Size and Speed

My trained EfficientNetB0 model was ~29MB. For web deployment, that's too large — users on 3G would wait seconds for the model to download. Three optimization techniques brought it down to ~4MB with minimal accuracy loss:

### Quantization (Post-Training)

```python
# Convert to TFLite with dynamic range quantization
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model('saved_model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
# Dynamic range quantization: weights quantized to int8, activations stay float32
tflite_model = converter.convert()

with open('model_quantized.tflite', 'wb') as f:
    f.write(tflite_model)

# Result: 29MB -> ~7.5MB, ~2% accuracy drop
```

### Full Integer Quantization (For Edge/CPU)

```python
# Full integer quantization - requires representative dataset
def representative_dataset():
    for image in calibration_images:
        yield [image.astype(np.float32)]

converter = tf.lite.TFLiteConverter.from_saved_model('saved_model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.uint8
converter.inference_output_type = tf.uint8

tflite_model = converter.convert()
# Result: 29MB -> ~4MB, runs on CPU without FPU
```

### Pruning (Training-Time)

```python
import tensorflow_model_optimization as tfmot

prune_low_magnitude = tfmot.sparsity.keras.prune_low_magnitude

pruning_params = {
    'pruning_schedule': tfmot.sparsity.keras.PolynomialDecay(
        initial_sparsity=0.0,
        final_sparsity=0.5,
        begin_step=2000,
        end_step=10000
    )
}

model = prune_low_magnitude(base_model, **pruning_params)
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Train with pruning callbacks
callbacks = [
    tfmot.sparsity.keras.UpdatePruningStep(),
    tfmot.sparsity.keras.PruningSummaries(log_dir='logs/pruning')
]
model.fit(train_ds, epochs=20, callbacks=callbacks)

# Strip pruning and export
model_for_export = tfmot.sparsity.keras.strip_pruning(model)
model_for_export.save('pruned_model')
```

| Technique | Model Size | Latency (CPU) | Accuracy Drop | Use Case |
|-----------|------------|---------------|---------------|----------|
| Original (FP32) | 29 MB | ~120ms | Baseline (94%) | GPU server |
| Dynamic Quantization | 7.5 MB | ~85ms | ~1.5% | Web (WASM) |
| Full INT8 Quantization | 4 MB | ~45ms | ~2.5% | Mobile/Edge |
| Pruned (50%) + Quantized | 2.8 MB | ~35ms | ~3.5% | Ultra-low bandwidth |

## 2. ONNX Conversion: Cross-Platform Runtime

TensorFlow Serving is great for Python backends, but what if you need to run inference in a Node.js service, a .NET app, or directly in the browser? **ONNX (Open Neural Network Exchange)** is the interchange format that makes this possible.

```bash
# TF -> ONNX conversion
pip install tf2onnx onnx onnxruntime

# Convert SavedModel to ONNX
python -m tf2onnx.convert \
    --saved-model saved_model \
    --output model.onnx \
    --opset 13 \
    --inputs input_1:0 \
    --outputs dense_1:0

# Verify the model
import onnx
model = onnx.load('model.onnx')
onnx.checker.check_model(model)
print(onnx.helper.printable_graph(model.graph))
```

### Running ONNX in Node.js

```javascript
// Node.js backend with onnxruntime-node
const ort = require('onnxruntime-node');
const sharp = require('sharp'); // Image preprocessing

class PlantDiseaseClassifier {
    constructor(modelPath) {
        this.session = null;
        this.modelPath = modelPath;
        this.classes = [/* 38 class names */];
    }

    async initialize() {
        this.session = await ort.InferenceSession.create(this.modelPath);
        // Warm up
        const dummy = new ort.Tensor('float32', new Float32Array(224 * 224 * 3), [1, 224, 224, 3]);
        await this.session.run({ 'input_1': dummy });
    }

    async predict(imageBuffer) {
        // Preprocess: resize, normalize to [-1, 1]
        const { data, info } = await sharp(imageBuffer)
            .resize(224, 224)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const input = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            input[i] = (data[i] / 127.5) - 1.0; // Normalize to [-1, 1]
        }

        const tensor = new ort.Tensor('float32', input, [1, 224, 224, 3]);
        const results = await this.session.run({ 'input_1': tensor });
        const output = results['dense_1'].data; // Float32Array(38)

        // Get top-3 predictions
        const predictions = Array.from(output)
            .map((prob, idx) => ({ class: this.classes[idx], probability: prob }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 3);

        return predictions;
    }
}

// Usage in Fastify/Express route
const classifier = new PlantDiseaseClassifier('./model.onnx');
await classifier.initialize();

app.post('/predict', async (req, res) => {
    const predictions = await classifier.predict(req.file.buffer);
    res.json({ predictions });
});
```

### Running ONNX in Browser (WebAssembly)

```javascript
// Frontend: onnxruntime-web
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('./model.onnx', {
    executionProviders: ['wasm'], // or 'webgl', 'webgpu'
    // For WASM, set WASM path
    // ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
});

async function predictFromImage(file) {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, 224, 224);

    const imageData = ctx.getImageData(0, 0, 224, 224);
    const input = new Float32Array(224 * 224 * 3);

    // Normalize: [0, 255] -> [-1, 1]
    for (let i = 0; i < imageData.data.length; i += 4) {
        const idx = i / 4;
        input[idx * 3] = (imageData.data[i] / 127.5) - 1;     // R
        input[idx * 3 + 1] = (imageData.data[i + 1] / 127.5) - 1; // G
        input[idx * 3 + 2] = (imageData.data[i + 2] / 127.5) - 1; // B
    }

    const tensor = new ort.Tensor('float32', input, [1, 224, 224, 3]);
    const results = await session.run({ 'input_1': tensor });
    return results['dense_1'].data; // Float32Array(38)
}
```

## 3. Serving Architecture: Options Compared

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| TensorFlow Serving + Docker | Native TF, batching, model versioning, gRPC/REST | Heavy (~500MB), Python-only clients | High-throughput Python backends |
| ONNX Runtime (Node.js/Python/Go/C#) | Cross-platform, lightweight, fast | Limited TF op support (check compatibility) | Polyglot microservices |
| ONNX Runtime Web (Browser) | Zero server cost, offline, privacy | WASM slower than native, model size matters | Client-side inference |
| TensorFlow.js (Browser) | Native WebGL/WASM, TF-like API | Model conversion needed, larger bundle | Interactive web demos |
| TFLite + React Native / Flutter | Mobile optimized, GPU delegate | Mobile-only | Mobile apps |

For Plant Disease Detection, I chose a **hybrid approach**:

- **Primary:** ONNX Runtime in Node.js backend (Fastify) — handles web requests, supports batching
- **Fallback/Offline:** ONNX Runtime Web (WASM) in browser — works offline, no server round-trip
- **Mobile:** TFLite INT8 model in React Native app

## 4. Preprocessing Consistency: The Silent Killer

The #1 cause of "model works in Python but not in production" is preprocessing mismatch. Training used `tf.keras.applications.efficientnet.preprocess_input` (scales to [-1, 1]), but the Node.js code used `/ 255.0` (scales to [0, 1]). Results: confident wrong predictions.

### Solution: Export Preprocessing as Part of Model

```python
# Add preprocessing layer to SavedModel
import tensorflow as tf
from tensorflow.keras.applications.efficientnet import preprocess_input

# Create preprocessing layer
inputs = tf.keras.Input(shape=(224, 224, 3), dtype=tf.uint8, name='raw_image')
x = tf.cast(inputs, tf.float32)
x = tf.keras.layers.Lambda(preprocess_input, name='preprocessing')(x)
# ... rest of model

# Or simpler: use TF2ONNX with preprocessing
# tf2onnx supports adding preprocessing via --inputs-as-nchw etc.

# Best: Save preprocessing config alongside model
import json
preprocessing_config = {
    "input_shape": [224, 224, 3],
    "input_dtype": "uint8",
    "normalization": "efficientnet",  # or "imagenet", "inception", "custom"
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225],
    "color_space": "RGB"
}
with open('preprocessing.json', 'w') as f:
    json.dump(preprocessing_config, f, indent=2)
```

```javascript
// Node.js: Load config and apply consistently
const preprocessing = require('./preprocessing.json');

function preprocess(imageBuffer) {
    // ... resize to preprocessing.input_shape ...
    const floatData = new Float32Array(data.length);

    if (preprocessing.normalization === 'efficientnet') {
        // EfficientNet: [-1, 1]
        for (let i = 0; i < data.length; i++) {
            floatData[i] = (data[i] / 127.5) - 1.0;
        }
    } else if (preprocessing.normalization === 'imagenet') {
        // ImageNet: normalize with mean/std
        for (let i = 0; i < data.length; i += 3) {
            floatData[i] = (data[i] / 255.0 - preprocessing.mean[0]) / preprocessing.std[0];
            floatData[i + 1] = (data[i + 1] / 255.0 - preprocessing.mean[1]) / preprocessing.std[1];
            floatData[i + 2] = (data[i + 2] / 255.0 - preprocessing.mean[2]) / preprocessing.std[2];
        }
    }
    return floatData;
}
```

## 5. Monitoring and Observability

You can't improve what you don't measure. In production, track:

- **Latency:** P50, P95, P99 per endpoint (preprocess + inference + postprocess)
- **Throughput:** Requests/sec, batch sizes
- **Error rates:** Model load failures, OOM, malformed inputs
- **Prediction distribution:** Class balance drift (detect data shift)
- **Confidence calibration:** Are high-confidence predictions actually correct?

```javascript
// Fastify + Prometheus metrics
const promClient = require('prom-client');

const inferenceDuration = new promClient.Histogram({
    name: 'model_inference_duration_seconds',
    help: 'Model inference latency',
    labelNames: ['model', 'version'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const predictionCounter = new promClient.Counter({
    name: 'model_predictions_total',
    help: 'Total predictions by class',
    labelNames: ['model', 'version', 'predicted_class']
});

app.post('/predict', async (req, res) => {
    const endTimer = inferenceDuration.startTimer({ model: 'plant-disease', version: 'v1.2' });

    try {
        const predictions = await classifier.predict(req.file.buffer);
        const topClass = predictions[0].class;

        predictionCounter.inc({ model: 'plant-disease', version: 'v1.2', predicted_class: topClass });

        res.json({ predictions });
    } finally {
        endTimer();
    }
});
```

## 6. A/B Testing and Model Versioning

Never replace a model in production without a rollback plan. Use **canary deployments**:

```yaml
# Docker Compose for canary deployment
version: '3.8'
services:
  model-v1:
    image: plant-disease:v1.2
    deploy:
      replicas: 3
    environment:
      - MODEL_VERSION=v1.2

  model-v2-canary:
    image: plant-disease:v2.0
    deploy:
      replicas: 1
    environment:
      - MODEL_VERSION=v2.0

  nginx:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
```

```nginx
# nginx.conf - 90% traffic to v1, 10% to v2
upstream model_backend {
    server model-v1:8000 weight=9;
    server model-v2-canary:8000 weight=1;
}

server {
    location /predict {
        proxy_pass http://model_backend;
        # Add version header for debugging
        add_header X-Model-Version $upstream_http_x_model_version;
    }
}
```

## Production Checklist

- ✅ Model quantized (INT8 for edge, dynamic for web)
- ✅ Converted to ONNX for cross-platform support
- ✅ Preprocessing config exported and versioned with model
- ✅ Consistent preprocessing in all runtimes (Python, Node, Browser)
- ✅ Latency benchmarks: P95 < 100ms on target hardware
- ✅ Model versioning + canary deployment capability
- ✅ Prometheus/Grafana metrics: latency, errors, prediction distribution
- ✅ Input validation: size limits, format checks, sanitization
- ✅ Graceful degradation: fallback to server if client inference fails
- ✅ Model integrity: checksum verification on load

## Conclusion

The model is only ~20% of the work. The other 80% is: preprocessing consistency, runtime compatibility, optimization for target hardware, monitoring, and deployment automation.

The Plant Disease Detection project implements all of this: EfficientNetB0 → INT8 TFLite (4MB) + ONNX, Node.js backend with ONNX Runtime, browser WASM fallback, React Native mobile app, and full observability. [View the code](https://github.com/suryashahi/plant-disease-detection) or [try the live demo](https://github.com/suryashahi/plant-disease-detection#demo).

---

*Next up: Building real-time features with Socket.IO and Redis — live order tracking, notifications, and scaling WebSocket connections. Don't miss it!*