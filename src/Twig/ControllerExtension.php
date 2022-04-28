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
        private readonly ControllerRepository $controllerRepository,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('get_controllers', [$this->controllerRepository, 'findAll']),
        ];
    }
}
