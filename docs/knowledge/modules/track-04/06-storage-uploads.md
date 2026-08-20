---
id: t04-storage-uploads
title: "Module 6: S3/Cloudflare R2 Storage, Multipart Uploads & Presigned URLs"
track: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
task_range: "TTS-076–TTS-088"
status: complete
tags: [tts, storage, s3, r2, aioboto3]
related: [t04-codecs-streaming, t04-waveform-cdn-observability]
---

# Module 6: S3/Cloudflare R2 Storage, Multipart Uploads & Presigned URLs

An async S3-compatible storage layer (Cloudflare R2 or AWS S3) for
finished audio assets: deterministic content-hash keys, single-part and
multipart uploads, presigned GET/PUT URLs, metadata tagging, lifecycle
rules, batch deletion, and a local-disk failover.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TTS-076 | Storage config & environment schema | None | `backend/app/core/storage/config.py`. `StorageSettings(endpoint_url, bucket_name, access_key_id, secret_access_key, region_name="auto", public_cdn_domain)`. | Validates R2/S3-compatible config. `uv run pytest tests/storage/test_config.py`. |
| TTS-077 | aioboto3 session pool & client lifecycle | TTS-076 | `backend/app/core/storage/client.py`. Async context manager `get_s3_client()` yielding `aioboto3.client("s3")` with pool limits. | Reuses async S3 client sessions safely across coroutines. `uv run pytest tests/storage/test_client.py`. |
| TTS-078 | Deterministic SHA-256 storage key generator | None | `backend/app/core/storage/keys.py`. `generate_audio_s3_key(lang, category, content_hash, ext="opus")`: `audio/{lang}/{category}/{hash[:2]}/{hash}.{ext}`. | Balanced, collision-free S3 prefix distribution. `uv run pytest tests/storage/test_keys.py`. |
| TTS-079 | Single-part small object uploader | TTS-077, TTS-078 | `backend/app/core/storage/single_upload.py`. `upload_audio_bytes(key, data, content_type="audio/opus")`. Headers: `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`. | Uploads files < 5MB in one PUT, returns a public CDN URL. `uv run pytest tests/storage/test_single_upload.py`. |
| TTS-080 | Concurrency-controlled multipart upload manager | TTS-077, TTS-078 | `backend/app/core/storage/multipart.py`. `upload_multipart_audio(key, file_stream, part_size_mb=5)`, max concurrency 4, auto-abort on exception. | Uploads large multi-minute dialogues without buffering the full file in RAM. `uv run pytest tests/storage/test_multipart.py`. |
| TTS-081 | S3 object metadata & audio tagging pipeline | TTS-079 | `backend/app/core/storage/metadata.py`. Custom headers: `x-amz-meta-duration-ms`, `x-amz-meta-voice-id`, `x-amz-meta-lufs`, `x-amz-meta-sample-rate`. | Metadata verifiable via `HeadObject` on uploaded assets. `uv run pytest tests/storage/test_metadata.py`. |
| TTS-082 | Presigned GET URL generator with TTL | TTS-077 | `backend/app/core/storage/presigned_get.py`. `generate_presigned_get_url(key, expires_in_seconds=3600)`. | Signed URL grants temporary read access to private assets. `uv run pytest tests/storage/test_presigned_get.py`. |
| TTS-083 | Presigned PUT URL generator for direct uploads | TTS-077 | `backend/app/core/storage/presigned_put.py`. `generate_presigned_put_url(key, content_type, max_size_bytes=10485760, expires_in=600)`. | Returns a presigned URL + form fields for direct client recording uploads to R2. `uv run pytest tests/storage/test_presigned_put.py`. |
| TTS-084 | Object exists & HeadObject metadata probe | TTS-077 | `backend/app/core/storage/probe.py`. `check_audio_exists(key) -> bool`, `get_audio_metadata(key) -> AudioMetadata \| None`. | Returns True when already synthesized/cached, skipping duplicate synthesis. `uv run pytest tests/storage/test_probe.py`. |
| TTS-085 | Bucket lifecycle & temp cleanup rule builder | TTS-076 | `backend/app/core/storage/lifecycle.py`. `setup_bucket_lifecycle_rules()`: 7-day expiry on `temp/*`, multipart abort after 24h. | Lifecycle JSON validates against AWS S3/R2 specs. `uv run pytest tests/storage/test_lifecycle.py`. |
| TTS-086 | Async batch object deletion service | TTS-077 | `backend/app/core/storage/batch_delete.py`. `delete_audio_keys_batch(keys) -> BatchDeleteResult`, chunked to max 1,000 keys per `DeleteObjects` call. | Deletes batches of orphaned assets idempotently. `uv run pytest tests/storage/test_batch_delete.py`. |
| TTS-087 | Storage failover & local filesystem fallback | TTS-079 | `backend/app/core/storage/fallback.py`. `LocalStorageFallback` saves to `/tmp/audio_fallback` if S3/R2 is unreachable. | Prevents synthesis failure during cloud storage outages. `uv run pytest tests/storage/test_fallback.py`. |
| TTS-088 | Storage client test suite (Moto/S3 mock) | TTS-076–TTS-087 | Full integration suite via `moto[s3]`: single-part, multipart, presigned URLs, error scenarios. | 100% coverage of storage client functions, no live AWS credentials. `uv run pytest tests/core/test_storage.py -v`. |

## Related packages
- [[t04-codecs-streaming]] — encoded audio flows into this module for storage
- [[t04-waveform-cdn-observability]] — reads stored assets for waveform/CDN handling
