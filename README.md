# Simple Weather Card

[![](https://img.shields.io/github/release/kalkih/simple-weather-card.svg?style=flat-square)](https://github.com/kalkih/simple-weather-card/releases/latest)

A minimalistic weather card for [Home Assistant](https://github.com/home-assistant/home-assistant) Lovelace UI, inspired by Google Material Design.


![Preview](https://user-images.githubusercontent.com/457678/53588519-61dfdf80-3b8d-11e9-9f0d-f5995ba794ce.png)

## Install

### Simple install

1. Download and copy `simple-weather-card.bundle.js` from the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest) into your `config/www` directory.

2. Add a reference to `simple-weather-card.bundle.js` inside your `ui-lovelace.yaml` or through the raw config editor interface.

    ```yaml
    resources:
      - url: /local/simple-weather-card.bundle.js?v=0.1.0
        type: module
    ```

### CLI install

1. Move into your `config/www` directory

2. Download `simple-weather-card.bundle.js`

    ```console
    $ wget https://github.com/kalkih/simple-weather-card/releases/download/v0.1.0/simple-weather-card.bundle.js
    ```

3. Add a reference to `simple-weather-card.bundle.js` inside your `ui-lovelace.yaml` or through the raw config editor gui.

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

2. Replace the local file with the one found in the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest).

3. Add the new version number to the end of the card reference url in your `ui-lovelace.yaml`. This will prevent the browser from loading the old version from cache.

    ```yaml
    resources:
      - url: /local/simple-weather-card.bundle.js?v=0.1.0
        type: module
    ```

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
| day | string | '#a55eea' | Background color (Day).
| night | string | '#45aaf2' | Background color (Night).
| text | string | 'var(--text-dark-color)' | Text color.

### Example usage

#### Standard card
![Standard card example](https://user-images.githubusercontent.com/457678/53588909-517c3480-3b8e-11e9-9d63-d49fa61507e3.png)

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  name: in current location
```

#### Backdrop example
![Backdrop example](https://user-images.githubusercontent.com/457678/53589125-d404f400-3b8e-11e9-8b54-977971fe83ea.png)

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  name: " "
  backdrop: true
```

#### Custom backdrop example
![Custom backdrop example](https://user-images.githubusercontent.com/457678/53589746-7e314b80-3b90-11e9-9ee9-f90bd8c43690.png)

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  name: at home
  backdrop:
    day: "var(--primary-color)"
    night: "#40445a"
```


## Problems?
Make sure you have `javascript_version: latest` set in your `configuration.yaml` under `frontend:`.

Make sure you got the latest version of `simple-weather-card.bundle.js`.

If you have issues after updating the card, try clearing the browser cache manually.

If you are getting "Custom element doesn't exist: simple-weather-card", or are running an older browser try replacing `type: module` with `type: js` in the resource reference in `ui-lovelace.yaml` or in the raw config editor.

## License
This project is under the MIT license.
