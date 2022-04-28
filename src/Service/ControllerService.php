<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Controller;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

class ControllerService
{
    public function __construct(
        private readonly HttpClientInterface $client,
    ) {
    }

    /**
     * @throws TransportExceptionInterface
     */
    public function callController(Controller $controller, string $path, array $parameters = []): ResponseInterface
    {
        return $this->client->request('GET', rtrim($controller->getBaseUri(), '/') . '/' . ltrim($path, '/'), [
            'query' => $parameters,
        ]);
    }
}
