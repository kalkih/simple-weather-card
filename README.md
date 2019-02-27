# Simple Weather Card

[![](https://img.shields.io/github/release/kalkih/simple-weather-card.svg?style=flat-square)](https://github.com/kalkih/simple-weather-card/releases/latest)

A minimalistic weather card for [Home Assistant](https://github.com/home-assistant/home-assistant) Lovelace UI, inspired by Google Material Design.


![Preview Image]()

## Install

### Simple install

1. Download and copy `simple-weather-card.bundle.js` from the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest) into your `config/www` directory.

2. Add a reference to `simple-weather-card.bundle.js` inside your `ui-lovelace.yaml`.

    ```yaml
    resources:
      - url: /local/simple-weather-card.bundle.js?v=0.1.0
        type: module
    ```

    or if you are using the UI editor paste this open the War editor and insert it at the top of the file.

### CLI install

1. Move into your `config/www` directory

2. Grab `simple-weather-card.bundle.js`

    ```console
    $ wget https://github.com/kalkih/simple-weather-card/releases/download/v0.1.0/simple-weather-card.bundle.js
    ```

3. Add a reference to `simple-weather-card.bundle.js` inside your `ui-lovelace.yaml`.

    ```yaml
    resources:
      - url: /local/simple-weather-card.bundle.js?v=0.1.0
        type: module
    ```

### *(Optional)* Add to custom updater

1. Make sure you've the [custom_updater](https://github.com/custom-components/custom_updater) component installed and working.

2. Add a new reference under `card_urls` in your `custom_updater` configuration in `configuration.yaml`.

    ```yaml
    custom_updater:
      card_urls:
        - https://raw.githubusercontent.com/kalkih/simple-weather-card/master/tracker.json
    ```

## Updating
1. Find your `simple-weather-card.bundle.js` file in `config/www` or wherever you ended up storing it.

2. Replace the local file with the latest one attached in the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest).

3. Add the new version number to the end of the cards reference url in your `ui-lovelace.yaml` like below.

    ```yaml
    resources:
      - url: /local/simple-weather-card.bundle.js?v=0.1.0
        type: module
    ```

*You may need to empty the browsers cache if you have problems loading the updated card.*

## Using the card

### Options

#### Card options
| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| type | string | **required** | v0.1.0 | `custom:simple-weather-card`
| entity | string | **required** | v0.1.0 | The entity_id from an entity within the `weather` domain.
| name | string | optional | v0.1.0 | Set a custom name.
| backdrop | boolean/object | false | v0.1.0 | Colored background, takes `true/false` or a [backdrop object](#backdrop-object-options).


#### Backdrop object options
See [Backdrop example](#backdrop-example) for example usage.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| fade | boolean | true | Faded background.
| day | string | '#B58BFF' | Background color (Day).
| night | string | '#03A9F4' | Background color (Night).

### Example usage

#### Standard card
![Preview Image]()

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
```

#### Backdrop example
![Preview Image]()

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  name: at current location
  backdrop: true
```

#### Custom backdrop example
![Preview Image]()

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  name: at Home
  backdrop:
    fade: false
    day: white
    night: #000000
```


## Getting errors?
Make sure you have `javascript_version: latest` in your `configuration.yaml` under `frontend:`.

Make sure you have the latest version of `simple-weather-card.bundle.js`.

If you have issues after updating the card, try clearing your browsers cache or restart Home Assistant.

If you are getting "Custom element doesn't exist: simple-weather-card" or running older browsers try replacing `type: module` with `type: js` in your resource reference, like below.

## License
This project is under the MIT license.
