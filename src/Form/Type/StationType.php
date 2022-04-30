<?php

declare(strict_types=1);

namespace App\Form\Type;

use App\Entity\Controller;
use App\Entity\Station;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class StationType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $builder->add('position', IntegerType::class, [
            'label' => 'Position',
            'required' => true,
        ]);

        $builder->add('controller', EntityType::class, [
            'label' => 'Controller',
            'class' => Controller::class,
            'required' => true,
            'placeholder' => '-- Please choose --'
        ]);

        $builder->add('strategy', ChoiceType::class, [
            'label' => 'Strategy',
            'choices' => $this->getStrategies(),
            'required' => true,
            'placeholder' => '-- Please choose --',
        ]);
    }

    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults([
            'data_class' => Station::class,
        ]);
    }

    private function getStrategies(): array
    {
        $strategies = [];

        $finder = new Finder();
        foreach ($finder->files()->in(__DIR__ . '/../../../assets/run/Strategy') as $file) {
            $strategy = $file->getFilenameWithoutExtension();
            $strategies[$strategy] = $strategy;
        }

        return $strategies;
    }
}
