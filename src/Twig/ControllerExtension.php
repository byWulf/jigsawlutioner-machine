<?php

declare(strict_types=1);

namespace App\Twig;


use App\Entity\Controller;
use App\Repository\ControllerRepository;
use App\Service\ControllerService;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

class ControllerExtension extends AbstractExtension
{
    public function __construct(
        private readonly ControllerService $controllerService,
        private readonly ControllerRepository $controllerRepository,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('is_controller_up', [$this, 'isControllerUp']),
            new TwigFunction('get_controllers', [$this->controllerRepository, 'findAll']),
        ];
    }

    public function isControllerUp(Controller $controller): bool
    {
        try {
            return $this->controllerService->callController($controller, '/up')->getStatusCode() === Response::HTTP_NO_CONTENT;
        } catch (TransportExceptionInterface) {
            return false;
        }
    }
}
