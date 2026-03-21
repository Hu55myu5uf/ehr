<?php
namespace App\Controllers;

use App\Services\WalletService;
use App\Middleware\AuthMiddleware;
use Respect\Validation\Validator as v;

class WalletController {
    private WalletService $walletService;

    public function __construct() {
        $this->walletService = new WalletService();
    }

    public function deposit(array $user): void {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $validator = v::key('patient_id', v::stringType()->notEmpty())
                ->key('amount', v::numericVal()->positive())
                ->key('payment_method', v::in(['cash', 'card', 'transfer', 'mobile']))
                ->key('description', v::optional(v::stringType()));

            $validator->assert($data);

            $result = $this->walletService->deposit(
                $data['patient_id'],
                (float)$data['amount'],
                $data['payment_method'],
                $data['description'] ?? 'Wallet Deposit',
                $user['id']
            );

            $this->success($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function history(array $user, string $patientId): void {
        try {
            $history = $this->walletService->getHistory($patientId);
            $balance = $this->walletService->getBalance($patientId);
            $this->success([
                'history' => $history,
                'balance' => $balance
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    private function success(array $data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $message, int $code = 400): void {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
    }
}
