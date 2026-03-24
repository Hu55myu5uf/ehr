<?php
$data = json_encode(['username' => 'admin', 'password' => 'password']);
$options = [
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n" .
                     "Accept: application/json\r\n" .
                     "User-Agent: Mozilla/5.0\r\n",
        'content' => $data,
        'ignore_errors' => true
    ]
];
$context  = stream_context_create($options);
$result = file_get_contents('https://viisecehr.kesug.com/public/api/auth/login', false, $context);
echo "HEADERS:\n";
print_r($http_response_header);
echo "\nBODY:\n";
echo $result;
