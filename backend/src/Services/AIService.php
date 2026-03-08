<?php

namespace App\Services;

class AIService
{
    private string $apiKey;
    private string $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

    public function __construct()
    {
        $this->apiKey = $_ENV['GEMINI_API_KEY'] ?? '';
    }

    /**
     * Send a prompt to Gemini and get a structured response
     */
    public function prompt(string $prompt, bool $isJson = true): ?array
    {
        if (empty($this->apiKey) || strpos($this->apiKey, 'your-gemini-api-key') !== false) {
            throw new \Exception("Gemini API Key not configured. Please add a valid key to your .env file.");
        }

        $url = $this->apiUrl . "?key=" . $this->apiKey;

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'topK' => 1,
                'topP' => 1,
                'maxOutputTokens' => 2048,
            ]
        ];

        if ($isJson) {
            $payload['generationConfig']['responseMimeType'] = 'application/json';
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new \Exception("CURL Error: " . $error);
        }

        if ($httpCode !== 200) {
            $err = json_decode($response, true);
            throw new \Exception("AI Provider Error: " . ($err['error']['message'] ?? 'Unknown Error'));
        }

        $data = json_decode($response, true);
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (!$text) {
            return null;
        }

        return $isJson ? json_decode($text, true) : ['response' => $text];
    }

    /**
     * Get system knowledge from JSON config
     */
    public function getSystemKnowledge(): array
    {
        $path = __DIR__ . '/../Config/system_knowledge.json';
        if (file_exists($path)) {
            return json_decode(file_get_contents($path), true);
        }
        return [];
    }
}
