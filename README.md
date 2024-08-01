# Chrome Extension Example

## Prerequisites

* [node + npm](https://nodejs.org/) (e.g node:20)

## Project Structure

* src/typescript: TypeScript source files
* src/assets: static files
* dist: Chrome Extension directory
* dist/js: Generated JavaScript files

## Install

```
npm install
```

## Build

```
npm run build
```

## Watch

```
npm run watch
```

## Start the Grafana stack

1. Git clone https://github.com/grafana/faro-web-sdk
2. Go to the faro-web-sdk directory
3. Run docker compose up
4. Go to http://localhost:3000

## How to load the extension on Chrome

1. Build the extension
2. Go to [chrome://extensions](chrome://extensions)
3. Click on `Load unpacked`
4. Choose the `dist` directory
