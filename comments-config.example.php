<?php
// Copy to /domains/mindiweik.com/comments-config.php on Hostinger (ABOVE
// public_html). Never commit the real file. comments.php loads it with
// require __DIR__ . '/../../comments-config.php'.
return [
  'db_host'        => 'localhost',
  'db_name'        => 'u112789821_comments',
  'db_user'        => 'u112789821_cuser',
  'db_pass'        => 'REPLACE_WITH_DB_PASSWORD',
  'admin_token'    => 'REPLACE_WITH_LONG_RANDOM_STRING',
  'allowed_origin' => 'https://mindiweik.com',
];
