<p align="center">
  <img src="https://i.ibb.co/kJSkyhD/tado-logo.png">
</p>


## Tado Platform v6

[![npm](https://img.shields.io/npm/v/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-tado-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-tado-platform)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)


**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.


**<u>NOTE:</u>** Updating from **<= v5.x** to **v6.x** will crash your homebridge, please **REMOVE** the old version first and check also the new [example-config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/example-config.json) 


## Info

**TafoPlatform** is possibly the biggest homebridge plugin for Tado devices. Pretty much everything you can do with the Tado app you can also do with this plugin and much more! Every temperature sensor, humidity sensor, contact sensor, motion sensor and thermostats are also able to show the history in Elgato EVE app.

Unlike other plugins, this plugin allows you to manually enable/disable each zone, thermostat, user and everything you see in HomeKit via config.json.

The config.json offers a lot of configuration options. And if, as recommended, you use Config UI X, the plugin will be all the better.

It supports the full potential of Config UI X and makes configuring the plugin much easier. With it, you can create a "home" in no time and control everything through Config UI X. From logging in to creating config.json works fully automatically with Config UI X!

<img src="https://i.ibb.co/tL955Lg/hb-tadoplatform-ui-test.gif" align="center" alt="CustomUI">

_(In the section below you can find more information about the functions.)_

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

 ```sudo npm install -g homebridge-tado-platform@latest```
 
 
 ## Example config.json:

```
{
  "bridge": {
    ...
  },
  "accessories": [
    ...
  ],
  "platforms": [
    {
      "name": "TadoPlatform",
      "platform": "TadoPlatform",
      "debug": false,
      "homes": [
        {
          "name": "My Home",
          "username": "test@user.com",
          "password": "myPassWord!",
          "polling": 60,
          "temperatureUnit": "CELSIUS",
          "zones": [
            {
              "active": true,
              "name": "Living Room",
              "type": "HEATING",
              "mode": "AUTO"
            },
            {
              "active": true,
              "id": 48,
              "name": "Badezimmer Unten",
              "type": "HOT_WATER",
              "mode": "AUTO",
              "boilerTempSupport": false,
              "accTypeBoiler": "FAUCET"
            }
          ]
        }
      ]
    }
  ]
}
```
See [Example Config](https://github.com/SeydX/homebridge-tado-platform/edit/beta/example-config.json) for more details


## Thermostat

Each zone in the config.json with ``"type": "HEATING"`` and ``"easyMode": false`` is exposed to HomeKit as a thermostat accessory with the following features:

- Current Mode: OFF | COOLING | HEATING | AUTO
- Target Mode: OFF | HEATING | AUTO
- Curent Temperature
- Target Temperature
- Built-in humidity sensor
- Separate Humidity (if ``"separateHumidity": true``)
- Separate Temperature Sensor (if ``"separateTemperature": true``)
- Battery state (if ``noBattery: false``)
- Delay Switch characteristic with timer (if ``"delaySwitch": true``)
- Elgato EVE history feature (FakeGato)

Each zone in the config.json with ``type: HEATING`` and ``easyMode: true`` is exposed to HomeKit as a HeaterCooler accessory with the features as above and some minor changes:

- Active: ON | OFF
- Target Mode: HEATING
- **NO** Elgato EVE history feature (FakeGato)

```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "id": 32,
        "name": "Living Room",
        "type": "HEATING",
        "delaySwitch": true,
        "openWindowSensor": true,
        "openWindowSwitch": false,
        "separateTemperature": false,
        "separateHumidity": true,
        "mode": "MANUAL",
        "modeTimer": 30,
        "easyMode": false,
        "noBattery": false
      }
      ...
    ]
  }
  ...
]
```


#### OpenWindow:

Each zone with ``"type": "HEATING"`` also has the possibility to display "OpenWindow" contact sensors or switches in HomeKit with the following features:

- Switch to enable disable open window for the zone or trigger the open window state of the zone
- Contact sensor to show the open window state

```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "name": "Living Room",
        "type": "HEATING",
        "mode": "AUTO"
        "openWindowSensor": true,
        "openWindowSwitch": true
        ...
      }
      ...
    ]
  }
  ...
]
```

#### ChildLock

Each device with ``"type": HEATING`` and child lock support can be exposed to HomeKit as Switches with following features:

- Shows the current child lock state for the device
- Possibility to change child lock state

```
"homes": [
  {
    "zones": [ ... ],
    "extras": {
      "childLockSwitches": [
        {
        "active": true,
        "name": "Living Room Heater",
        "serialNumber": "VA1234567890"
        },
        {
        "active": true,
        "name": "Sleeping Room Heater",
        "serialNumber": "VA1234567890"
        }
      ]
    }
    ...
  }
  ...
]
```


## Hot Water

Each zone in the config.json with ``"type": HOT_WATER`` and ``"boilerTempSupport": false`` is exposed to HomeKit as a switch (``"accTypeBoiler: "SWITCH"``) or faucet (``"accTypeBoiler: "FAUCET"``) accessory with the following features:

- Active: ON | OFF

Each zone in the config.json with ``type: HOT_WATER`` and ``boilerTempSupport: true`` is exposed to HomeKit as a HeaterCooler accessory with the following features:

- Current Mode: OFF | ON
- Target Mode: OFF | ON
- Curent Temperature
- Target Temperature
- Separate Temperature Sensor (if ``separateTemperature: true``)


```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "id": 1,
        "name": "Bathroom",
        "type": "HOT_WATER",
        "mode": "MANUAL",
        "modeTimer": 30,
        "separateTemperature": true,
        "boilerTempSupport": false,
        "accTypeBoiler": "SWITCH"
      }
      ...
    ]
  }
  ...
]
```

## Presence

Each user or anyone sensor in the config.json is exposed to HomeKit as a occupancy (``"accType: "OCCUPANCY"``) or motion (``"accType: "MOTION"``) accessory. 

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": {
      "anyone": true,
      "accTypeAnyone": "MOTION",
      "user": [
        {
          "active": true,
          "name": "Buddy 1",
          "accType": "MOTION"
        },
        {
          "active": true,
          "name": "Buddy 2",
          "accType": "OCCUPANCY"
        }
      ]
    }
    ...
  }
]
```

## Weather

Weather settings allow you to display a sensor for temperature, a light bulb for sun intensity, or a sensor for air quality in HomeKit.

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": {
      "temperatureSensor": true,
      "solarIntensity": true,
      "airQuality": true
    }
    ...
  }
  ...
]
```

### Air Quality

In order to use the Air Quality Sensor, you need to enable airQuality ``"airQuality": true`` (see above) **AND** you must enter your location data (latitude and longitude) in config.json. You can easily find the coordinates to your location/address on the following page: [latlong.net](https://www.latlong.net/convert-address-to-lat-long.html)


```
"homes": [
  {
    "geolocation": {
      "longitude": "13.765010",
      "latitude": "52.290840"
    },
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... }
    ...
  }
  ...
]
```


## Extras

**Central Switch:**
Shows a switch accessory with additional custom characteristics in HomeKit which mimics the "Boost" and "Turnoff" switch from Tado. It also shows the Heater Running information as a custom characteristic for the month (in hours) and it shows also how many thermostats are in auto, manual or off mode.

**Presence Lock:**
Shows a security accessory in HomeKit with following features: HOME | AWAY | DISABLED

**Boost Switch:**
Shows a switch accessory in HomeKit which mimics the "Boost" switch from Tado and switches all heaters to max temperature

**Shedule Switch:**
Shows a switch accessory in HomeKit which mimics the "Shedule" switch from Tado and switches all heaters to their default shedule

**Turnoff Switch:**
Shows a switch accessory in HomeKit which mimics the "Turn Off" switch from Tado and switches all heaters off

**Child Lock:**
Each device with ``"type": "HEATING"`` and child lock support can be exposed to HomeKit as switches which can show you if child lock is enabled or you can also enable/disable child lock.


```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "runningInformation": true,
      "presenceLock": true,
      "boostSwitch": true,
      "sheduleSwitch": true,
      "turnoffSwitch": true,
      "childLockSwitches": [
        {
        "active": true,
        "name": "Living Room Heater",
        "serialNumber": "VA1234567890"
        },
        {
        "active": true,
        "name": "Sleeping Room Heater",
        "serialNumber": "VA1234567890"
        }
      ]
    }
    ...
  }
  ...
]
```

## Telegram

You can set up the notifier to get a Telegram notification with customized messages and markdown capability when user arrives/leaves or open window detection triggers.

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "telegram": {
      "active": true,
      "token": "136373846:HKAHEVbsuwxl0uCSIi8kdFJsheköjezz72525",
      "chatID": "-123456789",
      "messages": {
        "presence": {
          "user_in": "Welcome at home @",
          "user_out": "Bye Bye @",
          "anyone_in": "Anyone at h;me.",
          "anyone_out": "Nobody at home."
        },
        "openWindow": {
          "opened": "@: Window opened!",
          "closed": "@: Window closed!"
        }
      }
    }
  }
  ...
]
```

## Supported clients

This plugin has been verified to work with the following apps on iOS 14:

* Apple Home
* All 3rd party apps like Elgato Eve etc.
* Homebridge >= v1.1.6


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-tado-platform/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-tado-platform/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin, you can enable the debug mode, which will provide some additional information. This might be useful for debugging issues. Open your config.json and set ``"debug": true``
