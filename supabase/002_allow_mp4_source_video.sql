update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/mp4',
  'audio/x-m4a',
  'video/mp4'
]
where id = 'karaoke-v2-source';
