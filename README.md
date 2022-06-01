# jigsawlutioner-machine

## Install

First clone this repository. Be sure to have docker up and running. Then execute:
```bash
composer dev:setup
```

## Usage
TODO...

Important: When solving, remember to start the solving handler and let it run in the background:
```bash
docker exec -it jigsawlutioner-machine-app bin/console messenger:consume solve
```
