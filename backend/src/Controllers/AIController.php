<?php

namespace App\Controllers;

use App\Services\AIService;
use App\Middleware\AuthMiddleware;

class AIController
{
    private AIService $service;

    public function __construct()
    {
        $this->service = new AIService();
    }

    private function success($data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $msg, int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $msg]);
    }

    /**
     * Analyze clinical notes for suggestions
     * POST /api/ai/analyze-consultation
     */
    public function analyzeConsultation(object $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $clinicalNotes = $input['notes'] ?? '';

            if (empty($clinicalNotes)) {
                $this->error("No clinical notes provided", 400);
                return;
            }

            $prompt = "You are a senior medical consultant assistant for ViiSec EHR. 
            Based on the following patient clinical notes, provide a structured JSON response with:
            1. likely_diagnoses: array of objects {diagnosis, icd_code, confidence}
            2. recommended_labs: array of strings
            3. recommended_meds: array of objects {medication, dosage, frequency, reason}
            4. clinical_advice: short string of advice for the doctor.

            Clinical Notes: \"$clinicalNotes\"
            
            Return ONLY the JSON object. No markdown, no prefixes.";

            $result = $this->service->prompt($prompt);
            $this->success($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * Simple system guide / help
     * POST /api/ai/help
     */
    public function getSystemHelp(object $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $query = $input['query'] ?? '';
            $context = $input['context'] ?? ''; // e.g. current page/route

            if (empty($query)) {
                $this->error("No query provided", 400);
                return;
            }

            $knowledge = $this->service->getSystemKnowledge();
            $knowledgeStr = json_encode($knowledge);

            $prompt = "You are the ViiSec EHR AI Assistant. 
            User Role: {$user->role}
            Current Page Context: $context
            
            System Workflows: $knowledgeStr

            User Question: \"$query\"

            Your goals:
            1. If the user asks about EHR system usage, provide clear, step-by-step instructions based on the System Workflows.
            2. If the user asks about global medical information, disease statistics, or general health questions, provide accurate, evidence-based data using your broad knowledge.
            3. Always maintain a professional, senior medical consultant persona.
            4. Keep responses organized using bullet points if multiple steps or stats are involved.";

            $result = $this->service->prompt($prompt, false);
            $this->success($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
