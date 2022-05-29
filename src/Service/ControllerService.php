<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Controller;
use App\Repository\ControllerRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

class ControllerService
{
    public function __construct(
        private readonly HttpClientInterface $client,
        private readonly ControllerRepository $controllerRepository,
    ) {
    }

    /**
     * @throws TransportExceptionInterface
     */
    public function callController(Controller $controller, string $path, array $parameters = [], array $options = []): ResponseInterface
    {
        $url = rtrim($controller->getBaseUri(), '/') . '/' . ltrim($path, '/');
        if (count($controller->getParameters() ?? []) > 0) {
            $url .= '?' . implode('&', $controller->getParameters());
        }

        return $this->client->request('GET', $url, [
            'query' => $parameters,
            ...$options,
        ]);
    }

    public function getAllUps(): array
    {
        $responses = [];
        $results = [];
        foreach ($this->controllerRepository->findAll() as $controller) {
            try {
                $responses[$controller->getId()] = $this->callController(
                    $controller,
                    '/up',
                    options: ['timeout' => 2]
                );
            } catch (TransportExceptionInterface) {
                $results[$controller->getId()] = false;
            }
        }

        foreach ($responses as $controllerId => $response) {
            try {
                $results[$controllerId] = $response->getStatusCode() === Response::HTTP_NO_CONTENT;
            } catch (TransportExceptionInterface) {
                $results[$controllerId] = false;
            }
        }

        return $results;
    }
}
