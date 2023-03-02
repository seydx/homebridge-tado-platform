/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "schema" }]*/

const schema = {
  'schema': {
    'name': {
      'title': 'Name',
      'type': 'string',
      'default': 'TadoPlatform',
      'description': 'Name for the log.'
    },
    'debug': {
      'title': 'Debug',
      'type': 'boolean',
      'description': 'Enables additional output in the log.'
    },
    'homes': {
      'title': ' ',
      'type': 'object',
      'properties': {
        'id': {
          'title': 'Home ID',
          'description': 'The id of your Home. Has to be the exact same id as in the web app of Tado.',
          'type': 'integer'
        },
        'name': {
          'title': 'Home Name',
          'description': 'The name of your Home. Has to be the exact same name as in the web app of Tado.',
          'type': 'string',
          'required': true
        },
        'username': {
          'title': 'Username',
          'type': 'string',
          'description': 'The user name that you use for the app and the web app of Tado.',
          'required': true
        },
        'password': {
          'title': 'Password',
          'type': 'string',
          'description': 'The password that you use for the app and the web app of Tado.',
          'required': true
        },
        'polling': {
          'title': 'Polling',
          'description': 'The polling interval in seconds.',
          'type': 'integer',
          'default': 300,
          'minimum': 300
        },
        'temperatureUnit': {
          'title': 'Temperature Unit',
          'description': 'Temperature Unit for accessories in HomeKit exposed by this plugin.',
          'type': 'string',
          'default': 'CELSIUS',
          'oneOf': [
            {
              'title': 'Celsius',
              'enum': [
                'CELSIUS'
              ]
            },
            {
              'title': 'Fahrenheit',
              'enum': [
                'FAHRENHEIT'
              ]
            }
          ]
        },
        'geolocation': {
          'title': 'Location',
          'type': 'object',
          'properties': {
            'longitude': {
              'title': 'Longitude',
              'type': 'string',
              'description': 'Longitude coordinate of your home. (Used for Air Quality)'
            },
            'latitude': {
              'title': 'Latitude',
              'type': 'string',
              'description': 'Latitude coordinate of your home. (Used for Air Quality)'
            }
          }
        },
        'presence': {
          'title': 'Presence',
          'type': 'object',
          'properties': {
            'anyone': {
              'title': 'Anyone Sensor',
              'type': 'boolean',
              'description': 'Exposes Anyone Sensor to Apple Home.'
            },
            'accTypeAnyone': {
              'title': 'Anyone Accessory Type',
              'type': 'string',
              'condition': {
                'functionBody': 'try { return model.homes.presence.anyone } catch(e){ return false }'
              },
              'oneOf': [
                {
                  'title': 'Occupancy',
                  'enum': [
                    'OCCUPANCY'
                  ]
                },
                {
                  'title': 'Motion',
                  'enum': [
                    'MOTION'
                  ]
                }
              ],
              'description': 'The accessory type for \'anyone\' sensor.'
            },
            'user': {
              'title': 'User',
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'active': {
                    'title': 'Active',
                    'type': 'boolean',
                    'description': 'If enabled, a new motion/occupancy sensor for this user will be exposed to HomeKit.'
                  },
                  'name': {
                    'title': 'Name',
                    'type': 'string',
                    'description': 'Name of the user for the motion/occupancy sensor.',
                    'required': true
                  },
                  'accType': {
                    'title': 'Accessory Type',
                    'type': 'string',
                    'condition': {
                      'functionBody': 'try { return model.homes.presence.user[arrayIndices[0]].active } catch(e){ return false }'
                    },
                    'oneOf': [
                      {
                        'title': 'Occupancy',
                        'enum': [
                          'OCCUPANCY'
                        ]
                      },
                      {
                        'title': 'Motion',
                        'enum': [
                          'MOTION'
                        ]
                      }
                    ],
                    'description': 'The accessory type of the device.'
                  }
                }
              }
            }
          }
        },
        'weather': {
          'title': 'Weather',
          'type': 'object',
          'properties': {
            'temperatureSensor': {
              'title': 'Temperature Sensor',
              'type': 'boolean',
              'description': 'If enabled, a temperature sensor for the weather will be exposed to HomeKit.'
            },
            'solarIntensity': {
              'title': 'Solar Intensity',
              'type': 'boolean',
              'description': 'If enabled, a lightbulb accessory for the solar intensity will be exposed to HomeKit.'
            },
            'accTypeSolarIntensity': {
              'title': 'Solar Intensity Accessory Type',
              'type': 'string',
              'condition': {
                'functionBody': 'try { return model.homes.weather.solarIntensity } catch(e){ return false }'
              },
              'oneOf': [
                {
                  'title': 'Lightbulb',
                  'enum': [
                    'LIGHTBULB'
                  ]
                },
                {
                  'title': 'Sensor',
                  'enum': [
                    'SENSOR'
                  ]
                }
              ],
              'description': 'The accessory type of the device.'
            },
            'airQuality': {
              'title': 'Air Quality',
              'type': 'boolean',
              'description': 'If enabled, a air quality sensor will be exposed to HomeKit. (Longitute and Latitude must be set in the config)'
            }
          }
        },
        'extras': {
          'title': 'Extras',
          'type': 'object',
          'properties': {
            'centralSwitch': {
              'title': 'Central Switch',
              'type': 'boolean',
              'description': 'If enabled, a switch will be exposed to HomeKit to enable/disable all thermostats/boiler at once.'
            },
            'runningInformation': {
              'title': 'Heat Running Information',
              'type': 'boolean',
              'description': 'If enabled, the central switch will get custom characteristics to show a summary of the heat running in hours.',
              'condition': {
                'functionBody': 'try { return model.homes.extras.centralSwitch } catch(e){ return false }'
              }
            },
            'presenceLock': {
              'title': 'Presence Lock',
              'type': 'boolean',
              'description': 'If enabled, a Home/Away switch will be exposed to HomeKit.'
            },
            'accTypePresenceLock': {
              'title': 'Presence Lock Accessory Type',
              'type': 'string',
              'oneOf': [
                {
                  'title': 'Security System',
                  'enum': [
                    'ALARM'
                  ]
                },
                {
                  'title': 'Switch',
                  'enum': [
                    'SWITCH'
                  ]
                }
              ],
              'description': 'The accessory type of the presence lock.'
            },
            'boostSwitch': {
              'title': 'Boost Switch',
              'type': 'boolean',
              'condition': {
                'functionBody': 'try { return model.homes.extras.centralSwitch } catch(e){ return false }'
              },
              'description': 'If enabled, a boost heat switch will be added to the central switch.'
            },
            'sheduleSwitch': {
              'title': 'Shedule Switch',
              'type': 'boolean',
              'condition': {
                'functionBody': 'try { return model.homes.extras.centralSwitch } catch(e){ return false }'
              },
              'description': 'If enabled, a shedule heat switch will be added to the central switch.'
            },
            'turnoffSwitch': {
              'title': 'Turn Off Switch',
              'type': 'boolean',
              'condition': {
                'functionBody': 'try { return model.homes.extras.centralSwitch } catch(e){ return false }'
              },
              'description': 'If enabled, a turn off heat switch will be added to the central switch.'
            },
            'dummySwitch': {
              'title': 'Dummy Switch',
              'type': 'boolean',
              'condition': {
                'functionBody': 'try { return model.homes.extras.centralSwitch } catch(e){ return false }'
              },
              'description': 'If enabled, a dummy switch (for eg automation purposes) will be added to the central switch.'
            },
            'childLockSwitches': {
              'title': 'Child Lock Switches',
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'active': {
                    'title': 'Active',
                    'type': 'boolean',
                    'description': 'If enabled, a child lock switch for this device will be exposed to HomeKit.'
                  },
                  'name': {
                    'title': 'Name',
                    'type': 'string',
                    'description': 'Name for the Child Lock Switch.',
                    'required': true
                  },
                  'serialNumber': {
                    'title': 'Device Serial Number',
                    'type': 'string',
                    'description': 'Enter the serial number of the device from which you want to display a \'Child Lock Switch\' in HomeKit. (only for devices with child lock support)',
                    'required': true,
                    'condition': {
                      'functionBody': 'try { return model.homes.extras.childLockSwitches[arrayIndices[0]].active } catch(e){ return false }'
                    }
                  }
                }
              }
            }
          }
        },
        'zones': {
          'title': 'Zones',
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'active': {
                'title': 'Active',
                'type': 'boolean',
                'description': 'If enabled, a new thermostat/boiler switch will be exposed to HomeKit.'
              },
              'id': {
                'title': 'ID',
                'type': 'integer',
                'description': 'Zone ID. Has to be the exact same id as in the web app of Tado.',
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].active } catch(e){ return false }'
                }
              },
              'name': {
                'title': 'Name',
                'type': 'string',
                'description': 'Zone Name. Has to be the exact same name as in the web app of Tado.',
                'required': true
              },
              'delaySwitch': {
                'title': 'Delay Switch',
                'type': 'boolean',
                'description': 'If enabled, additional delay switch characteristic for each zone will be within the accessory. If the delay switch is turned on, the thermostat/boiler will not change state until delay is turned off (timer adjustable within accessory).'
              },
              'autoOffDelay': {
                'title': 'Auto Off',
                'type': 'boolean',
                'description': 'If enabled, the delay switch will not affect the thermostats and it automatically turns off after the period has expired.'
              },
              'openWindowSensor': {
                'title': 'Open Window Sensor',
                'type': 'boolean',
                'description': 'If enabled, additional window contact accessory for each zone will be exposed to HomeKit which triggers if tado detects an open window.'
              },
              'openWindowSwitch': {
                'title': 'Open Window Switch',
                'type': 'boolean',
                'description': 'If enabled, additional window switch accessory for each zone will be exposed to HomeKit to trigger and enable/disable open window.'
              },
              'airQuality': {
                'title': 'Room Air Quality Sensor',
                'type': 'boolean',
                'description': 'If enabled, the thermostat/heater cooler accessory will also show an air quality indicator.',
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                }
              },
              'separateTemperature': {
                'title': 'Separate Temperature Sensors',
                'type': 'boolean',
                'description': 'If enabled, the temperature sensor will be shown as extra accessory.'
              },
              'separateHumidity': {
                'title': 'Separate Humidity Sensors',
                'type': 'boolean',
                'description': 'If enabled, the humidity sensor will be shown as extra accessory.',
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                }
              },  
              'minStep': {
                'title': 'Temperature Step',
                'type': 'string',
                'description': 'Minimum step for temperature adjustment. (Default: 1, must be between 0 - 1)'                                
              },
              'minValue': {
                'title': 'Minimum Temperature',
                'type': 'integer',
                'description': 'Minimum adjustable temperature value (in celsius/fahrenheit). HEATING devices also this plugin, supports a minValue of 5° Celsius / 41° Fahrenheit by default. HOT WATER devices, also this plugin, supports a minValue of of 30° Celsius / 86° Fahrenheit by default. If your device has a different minValue, you can set it up here. (Incorrect minValue may cause problems!)'               
              },
              'maxValue': {
                'title': 'Maximum Temperature',
                'type': 'integer',
                'description': 'Maximum adjustable temperature value (in celsius/fahrenheit). HEATING devices also this plugin, supports a maxValue of 25° Celsius / 77° Fahrenheit  by default. HOT WATER devices, also this plugin, supports a maxValue of of 65° Celsius / 149° Fahrenheit by default. If your device has a different maxValue, you can set it up here. (Incorrect maxValue may cause problems!)'                
              },   
              'mode': {
                'title': 'Termination Mode',
                'type': 'string',
                'required': true,
                'oneOf': [
                  {
                    'title': 'Auto',
                    'enum': [
                      'AUTO'
                    ]
                  },
                  {
                    'title': 'Manual',
                    'enum': [
                      'MANUAL'
                    ]
                  },
                  {
                    'title': 'Timer',
                    'enum': [
                      'TIMER'
                    ]
                  },
                  {
                    'title': 'Custom',
                    'enum': [
                      'CUSTOM'
                    ]
                  }
                ],
                'description': 'Mode for the commands to be sent with. can be \'MANUAL\' for manual control until ended by the user, \'AUTO\' for manual control until next schedule change in tado° app, \'TIMER\' for manual control until timer ends or \'CUSTOM\' for a mixed use of MANUAL (off) and AUTO (on). (CUSTOM is only for HEATING types with easyMode enabled and HOT_WATER types with temperature support).'
              },  
              'modeTimer': {
                'title': 'Timer',
                'description': 'Timer for the manual mode in minutes.',
                'type': 'integer',
                'minimum': 1,
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].mode === \'TIMER\' } catch(e){ return false }'
                }
              },
              'easyMode': {
                'title': 'Simple Target Mode',
                'type': 'boolean',
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                },
                'description': 'If enabled, only \'ON | OFF\' target modes are visible for the thermostat.'
              },
              'noBattery': {
                'title': 'No Battery',
                'type': 'boolean',
                'condition': {
                  'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                },
                'description': 'If enabled, the battery indicator will be removed from HomeKit.'
              },
              'type': {
                'title': 'Type',
                'type': 'string',
                'required': true,
                'oneOf': [
                  {
                    'title': 'Heating',
                    'enum': [
                      'HEATING'
                    ]
                  },
                  {
                    'title': 'Hot Water',
                    'enum': [
                      'HOT_WATER'
                    ]
                  }
                ],
                'description': 'Zone Heating type.'
              },
              'boilerTempSupport': {
                'title': 'Boiler (Hot Water) with temperature adjustment',
                'type': 'boolean',
                'description': 'Enable this if your can also adjust the temperature from your hot water.'
              },
              'accTypeBoiler': {
                'title': 'Boiler (Hot Water) Accessory Type',
                'type': 'string',
                'oneOf': [
                  {
                    'title': 'Faucet',
                    'enum': [
                      'FAUCET'
                    ]
                  },
                  {
                    'title': 'Switch',
                    'enum': [
                      'SWITCH'
                    ]
                  }
                ],
                'description': 'Boiler accessory type.'
              }
            }
          }
        },
        'telegram': {
          'titel': 'Telegram',
          'type': 'object',
          'properties': {
            'active': {
              'title': 'Active',
              'description': 'Activates Telegram.',
              'type': 'boolean',
              'required': true,
              'default': false
            },
            'token': {
              'title': 'Token',
              'type': 'string',
              'description': 'Telegram Bot Token.',
              'required': true
            },
            'chatID': {
              'title': 'Chat ID',
              'type': 'string',
              'description': 'Telegram Chat ID.',
              'required': true
            },
            'messages': {
              'title': 'Messages',
              'type': 'object',
              'properties': {
                'presence': {
                  'title': 'Presence',
                  'type': 'object',
                  'properties': {
                    'user_in': {
                      'title': 'User Detected',
                      'type': 'string',
                      'description': 'Message if user detected. (Hint: @ will be replaced with accessory name)'
                    },
                    'user_out': {
                      'title': 'User Not Detected',
                      'type': 'string',
                      'description': 'Message if user not detected anymore. (Hint: @ will be replaced with accessory name)'
                    },
                    'anyone_in': {
                      'title': 'Anyone Detected',
                      'type': 'string',
                      'description': 'Message if anyone detected.'
                    },
                    'anyone_out': {
                      'title': 'Anyone Not Detected',
                      'type': 'string',
                      'description': 'Message if nobody detected.'
                    }
                  }
                },
                'openWindow': {
                  'title': 'Open Window',
                  'type': 'object',
                  'properties': {
                    'opened': {
                      'title': 'Window Opened',
                      'type': 'string',
                      'description': 'Message if window is opened. (Hint: @ will be replaced with accessory name)'
                    },
                    'closed': {
                      'title': 'Window Closed',
                      'type': 'string',
                      'description': 'Message if window is closed. (Hint: @ will be replaced with accessory name)'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'layout': [
    'name',
    'debug',
    'homes.name',
    'homes.polling',
    'homes.temperatureUnit',
    {
      'key': 'homes',
      'title': 'Credentials',
      'type': 'section',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        'homes.id',
        'homes.username',
        'homes.password'
      ]
    },
    {
      'key': 'homes.zones',
      'type': 'section',
      'title': 'Zones',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'buttonText': 'Add Zone',
      'items': [
        {
          'key': 'homes.zones[]',
          'items': [
            {
              'title': 'Zone',
              'orderable': false,
              'items': [
                'homes.zones[].active',
                'homes.zones[].name',
                'homes.zones[].type',
                'homes.zones[].mode',
                'homes.zones[].modeTimer'
              ]
            },
            {
              'title': 'Options',
              'expandable': true,
              'expanded': false,
              'orderable': false,
              'condition': {
                'functionBody': 'try { return model.homes.zones[arrayIndices[0]].active } catch(e) { return false };'
              },
              'items': [
                'homes.zones[].id',
                'homes.zones[].easyMode',
                'homes.zones[].noBattery', 
                {
                  'title': 'Temperature',
                  'orderable': false,
                  'expandable': true,
                  'expanded': false,
                  'type': 'section',
                  'items': [ 
                    'homes.zones[].minValue',
                    'homes.zones[].maxValue',                                      
                    'homes.zones[].minStep'
                  ]
                },                
                {
                  'title': 'Hot Water',
                  'orderable': false,
                  'expandable': true,
                  'expanded': false,
                  'type': 'section',
                  'condition': {
                    'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HOT_WATER\' } catch(e){ return false }'
                  },
                  'items': [
                    'homes.zones[].boilerTempSupport',
                    'homes.zones[].accTypeBoiler'
                  ]
                },
                {
                  'title': 'Open Window',
                  'orderable': false,
                  'expandable': true,
                  'expanded': false,
                  'type': 'section',
                  'condition': {
                    'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                  },
                  'items': [
                    'homes.zones[].openWindowSensor',
                    'homes.zones[].openWindowSwitch'
                  ]
                },
                {
                  'title': 'Sensors',
                  'orderable': false,
                  'expandable': true,
                  'expanded': false,
                  'type': 'section',
                  'items': [
                    'homes.zones[].airQuality',
                    'homes.zones[].separateTemperature',
                    'homes.zones[].separateHumidity'
                  ]
                },
                {
                  'title': 'Delay',
                  'orderable': false,
                  'expandable': true,
                  'expanded': false,
                  'type': 'section',
                  'condition': {
                    'functionBody': 'try { return model.homes.zones[arrayIndices[0]].type === \'HEATING\' } catch(e){ return false }'
                  },
                  'items': [
                    'homes.zones[].delaySwitch',
                    'homes.zones[].autoOffDelay'
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      'key': 'homes',
      'type': 'section',
      'title': 'Presence',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        {
          'title': 'Anyone',
          'orderable': false,
          'items': [
            'homes.presence.anyone',
            'homes.presence.accTypeAnyone'
          ]
        },
        {
          'key': 'homes.presence.user',
          'title': 'User',
          'expandable': true,
          'expanded': false,
          'orderable': false,
          'buttonText': 'Add User',
          'items': [
            {
              'key': 'homes.presence.user[]',
              'items': [
                'homes.presence.user[].active',
                'homes.presence.user[].name',
                'homes.presence.user[].accType'
              ]
            }
          ]
        }
      ]
    },
    {
      'key': 'homes',
      'type': 'section',
      'title': 'Weather',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        'homes.weather.temperatureSensor',
        'homes.weather.solarIntensity',
        'homes.weather.accTypeSolarIntensity',
        'homes.weather.airQuality',
        {
          'title': 'Location',
          'condition': {
            'functionBody': 'try { return model.homes.weather.airQuality } catch(e) { return false };'
          },
          'orderable': false,
          'items': [
            'homes.geolocation.longitude',
            'homes.geolocation.latitude'
          ]
        }
      ]
    },
    {
      'key': 'homes',
      'type': 'section',
      'title': 'Extras',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        {
          'title': 'Central Switch',
          'type': 'section',
          'expandable': true,
          'expanded': false,
          'orderable': false,
          'items': [
            'homes.extras.centralSwitch',
            'homes.extras.runningInformation',
            'homes.extras.boostSwitch',
            'homes.extras.sheduleSwitch',
            'homes.extras.turnoffSwitch',
            'homes.extras.dummySwitch'
          ]
        },
        {
          'title': 'Presence Lock',
          'type': 'section',
          'expandable': true,
          'expanded': false,
          'orderable': false,
          'items': [
            'homes.extras.presenceLock',
            'homes.extras.accTypePresenceLock'
          ]
        },
        {
          'key': 'homes.extras.childLockSwitches',
          'title': 'Child Lock',
          'buttonText': 'Add Switch',
          'type': 'section',
          'expandable': true,
          'expanded': false,
          'orderable': false,
          'items': [
            'homes.extras.childLockSwitches[].active',
            'homes.extras.childLockSwitches[].name',
            'homes.extras.childLockSwitches[].serialNumber'
          ]
        }
      ]
    },
    {
      'key': 'homes',
      'title': 'Telegram',
      'type': 'section',
      'orderable': false,
      'expandable': true,
      'expanded': false,
      'items': [
        'homes.telegram.active',
        {
          'title': 'Credentials',
          'condition': {
            'functionBody': 'try { return model.homes.telegram.active } catch(e) { return false };'
          },
          'orderable': false,
          'items': [
            'homes.telegram.token',
            'homes.telegram.chatID'
          ]
        },
        {
          'title': 'Messages',
          'condition': {
            'functionBody': 'try { return model.homes.telegram.active } catch(e) { return false };'
          },
          'orderable': false,
          'items': [
            {
              'key': 'homes.telegram',
              'type': 'section',
              'title': 'Presence',
              'expandable': true,
              'expanded': false,
              'orderable': false,
              'items': [
                'homes.telegram.messages.presence.user_in',
                'homes.telegram.messages.presence.user_out',
                'homes.telegram.messages.presence.anyone_in',
                'homes.telegram.messages.presence.anyone_out'
              ]
            },
            {
              'key': 'homes.telegram',
              'type': 'section',
              'title': 'Open Window',
              'expandable': true,
              'expanded': false,
              'orderable': false,
              'items': [
                'homes.telegram.messages.openWindow.opened',
                'homes.telegram.messages.openWindow.closed'
              ]
            }
          ]
        }
      ]
    }
  ]
};