<?php

namespace App\Enum;

enum TypeTagAdresse: string
{
    case PAYS = 'pays';
    case REGION = 'region';
    case VILLE = 'ville';
    case RUE = 'rue';
    case NUMRUE = 'numrue';

    public function getLabel(): string
    {
        return match($this) {
            self::PAYS => 'Pays',
            self::REGION => 'Région',
            self::VILLE => 'Ville',
            self::RUE => 'Rue',
            self::NUMRUE => 'Numéro de rue',
        };
    }
}

