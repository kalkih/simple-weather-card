# Simple Weather Card

[![](https://img.shields.io/github/release/kalkih/simple-weather-card.svg?style=flat-square)](https://github.com/kalkih/simple-weather-card/releases/latest)

A minimalistic weather card for [Home Assistant](https://github.com/home-assistant/home-assistant) Lovelace UI, inspired by Google Material Design.


![Preview](https://user-images.githubusercontent.com/457678/53588519-61dfdf80-3b8d-11e9-9f0d-f5995ba794ce.png)

## Install

*This card is available in [HACS](https://github.com/custom-components/hacs) (Home Assistant Community Store)*

### Manual install

1. Download and copy `simple-weather-card-bundle.js` from the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest) into your `config/www` directory.

2. Add a reference to `simple-weather-card-bundle.js` inside your `ui-lovelace.yaml` or through the raw config editor interface.

    ```yaml
    resources:
      - url: /local/simple-weather-card-bundle.js?v=0.8.1
        type: module
    ```

### CLI install

1. Move into your `config/www` directory

2. Download `simple-weather-card-bundle.js`

    ```console
    $ wget https://github.com/kalkih/simple-weather-card/releases/download/v0.8.1/simple-weather-card-bundle.js
    ```

3. Add a reference to `simple-weather-card-bundle.js` inside your `ui-lovelace.yaml` or through the raw config editor gui.

    ```yaml
    resources:
      - url: /local/simple-weather-card-bundle.js?v=0.8.1
        type: module
    ```

## Updating
1. Find your `simple-weather-card-bundle.js` file in `config/www` or wherever you ended up storing it.

2. Replace the local file with the one found in the [latest release](https://github.com/kalkih/simple-weather-card/releases/latest).

3. Add the new version number to the end of the card reference url in your `ui-lovelace.yaml`. This will prevent the browser from loading the old version from cache.

    ```yaml
    resources:
      - url: /local/simple-weather-card-bundle.js?v=0.8.1
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
| primary_info | array/string | `extrema` | v0.7.0 | Primary card information, one or more [weather attributes](#weather-attributes)
| secondary_info | array/string | `precipitation` | v0.2.0 | Secondary card information, one or more [weather attributes](#weather-attributes)
| backdrop | boolean/object | `false` | v0.1.0 | Colored background, accepts `true/false` or a [Backdrop object](#backdrop-object-options).
| custom | array | optional | v0.4.0 | Override weather information with custom sensors, see [Custom option](#custom-option-array).
| tap_action | [action object](#action-object-options) | optional | v0.5.0 | Action on click/tap.


#### Weather attributes

| Name |  Description |
|------|--------------|
| extrema | Forecast high and low temperature |
| precipitation | Forecast precipitation |
| precipitation_probability | Probability of precipitation |
| humidity | Current humidity |
| wind_speed | Current wind speed |
| wind_bearing | Current wind direction |
| pressure | Current air pressure |

#### Backdrop object options
See [Backdrop example](#backdrop-example) for example usage.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| fade | boolean | `false` | Faded background.
| day | string | '#45aaf2' | Background color (Day).
| night | string | '#a55eea' | Background color (Night).
| text | string | 'var(--text-dark-color)' | Text color.

#### Custom option array
See [Custom example](#custom-sensors-example) for example usage.
Possible entries are: `temp`, `high`, `low`, `state`, `precipitation`, `humidity`, `icon-state`, `wind_speed`, `wind_bearing`, `pressure` & `precipitation_probability`.

```yaml
custom:
  - temp: sensor.home_temp
  - high: sensor.home_high_temp
  - low: sensor.home_low_temp
```

#### Action object options

| Name | Type | Default | Options | Description |
|------|------|---------|-------------|-------------|
| action | string | `more-info` | `more-info`, `navigate`, `call-service`, `none` | Action to perform
| service | string | none | Any service | Service to call (e.g. `media_player.toggle`) when `action` is defined as `call-service`
| service_data | object | none | Any service data | Service data to include with the service call (e.g. `entity_id: media_player.office`) 
| navigation_path | string | none | Any path | Path to navigate to (e.g. `/lovelace/0/`) when `action` is defined as `navigate`
| entity | string | none | Any entity id | Override default entity of more-info, when `action` is defined as `more-info`


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

#### Customize weather information example
![Customize weather information example](https://user-images.githubusercontent.com/457678/72923722-ead8aa00-3d4f-11ea-956f-05b706e00827.png)

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  primary_info:
    - wind_bearing
    - humidity
  secondary_info:
    - precipitation
    - precipitation_probability
```

#### Custom sensors example

```yaml
- type: custom:simple-weather-card
  entity: weather.smhi
  custom:
    - temp: sensor.home_temp
    - high: sensor.home_high_temp
    - low: sensor.home_low_temp
```


## Problems?
Make sure you have `javascript_version: latest` set in your `configuration.yaml` under `frontend:`.

Make sure you got the latest version of `simple-weather-card-bundle.js`.

If you have issues after updating the card, try clearing the browser cache manually.

If you are getting "Custom element doesn't exist: simple-weather-card", or are running an older browser try replacing `type: module` with `type: js` in the resource reference in `ui-lovelace.yaml` or in the raw config editor.

## License
This project is under the MIT license.
