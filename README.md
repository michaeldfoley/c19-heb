# c19-heb
Automate checking for vaccine appointments

## Prerequisites
- [Node.js](https://nodejs.org/) - version 14
- [Yarn](https://classic.yarnpkg.com/) - version 1

## Installation
```sh
yarn install
```

## Run
```sh
yarn start
```

### Options
Use the following options to customize your search. The search coordinates default to Austin, TX.

| flag | description | default |
| --- | --- |
| `--lat` | latitude of your starting location | 30.267153 |
| `--long` | longitude of your starting location | -97.743057 |
| `--distance` | distance to search (in miles) from starting location | 25 |
| `--types` | vaccine types to search for | Pfizer,Moderna,Janssen |

### Examples
To expand your search radius and only search for the J&J/Janssen vaccine
```sh
yarn start --distance=50 --types=Janssen
```

To change your search location to Dallas, TX and search for the Pfizer and Moderna vaccines
```sh
yarn start --lat=32.776665 --long=-96.796989 --types=Pfizer,Moderna
```