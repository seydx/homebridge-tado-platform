'use strict';  

const Logger = require('../helper/logger.js');

const got = require('got');
const { ResourceOwnerPassword } = require('simple-oauth2');

const EXPIRATION_WINDOW_IN_SECONDS = 300;
const tado_url = 'https://my.tado.com';

class Tado {

  constructor(name, credentials) {  

    this.credentials = credentials;
    this.name = name;
    
    //https://my.tado.com/webapp/env.js
    const params = {
      client: {
        id: 'tado-web-app',
        secret: 'wZaRN7rpjn3FoNyF5IFuxg9uMzYJcvOoQ8QWiIqS3hfk6gLhVlG57j5YNoZL2Rtc'
      },
      auth: {
        tokenHost: 'https://auth.tado.com'
      }
    };
    
    this.client = new ResourceOwnerPassword(params);

    Logger.debug('API successfull initialized', this.name);

  }
  
  async _login() {
  
    const tokenParams = {
      username: this.credentials.username,
      password: this.credentials.password,
      scope: 'home.user',
    };

    this._accessToken = await this.client.getToken(tokenParams);
 
  }

  async _refreshToken() {
  
    if (!this._accessToken) {
      await this._login();
    }
  
    if (this._accessToken.expired(EXPIRATION_WINDOW_IN_SECONDS)) {
          
      Logger.debug('Access Token expired! Refreshing token...', this.name);
      
      this._accessToken = await this._accessToken.refresh();
      
      Logger.debug('Access token refreshed!', this.name);
    
    } else {
      
      Logger.debug('Access token NOT expired', this.name);
      
    }
    
    return;
    
  }

  async apiCall(path, method = 'GET', data = {}, params = {}, tado_url_dif, blockLog) {
      
    Logger.debug('Checking access token..', this.name);
                                                  
    await this._refreshToken();
    
    let tadoLink = tado_url_dif || tado_url;
    
    Logger.debug('Using ' + tadoLink, this.name);
    
    Logger.debug('API request ' + method + ' ' + path +  ' ' + (data && Object.keys(data).length ? JSON.stringify(data) + ' <pending>': '<pending>'), this.name);
    
    let config = {
      method: method,
      responseType: 'json',
      headers: {
        Authorization: 'Bearer ' + this._accessToken.token.access_token
      },
      timeout: 30000,
      retry: {
        limit: 2,
        statusCodes: [408, 429, 503, 504],
        methods: ['GET', 'POST', 'DELETE', 'PUT']
      }
    };
    
    if(Object.keys(data).length)
      config.json = data; 
      
    if(Object.keys(params).length)
      config.searchParams = params;
    
    const response = await got(tadoLink + path, config);
    
    Logger.debug('API request ' + method + ' ' + path +  ' ' + (data && Object.keys(data).length ? JSON.stringify(data) + ' <success>': '<success>'), this.name);
    
    if(!blockLog)
      Logger.debug('API request ' + method + ' ' + path +  ' <response> ' + JSON.stringify(response.body), this.name);
    
    return response.body;
    
  }

  async getMe() {
    return this.apiCall('/api/v2/me');
  }

  async getHome(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}`);
  }

  async getWeather(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/weather`);
  }

  async getDevices(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/devices`);
  }

  async getDeviceTemperatureOffset(device_id) {
    return this.apiCall(`/api/v2/devices/${device_id}/temperatureOffset`);
  }

  async getInstallations(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/installations`);
  }

  async getUsers(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/users`);
  }

  async getState(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/state`);
  }

  async getMobileDevices(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/mobileDevices`);
  }

  async getMobileDevice(home_id, device_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/mobileDevices/${device_id}`);
  }

  async getMobileDeviceSettings(home_id, device_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/mobileDevices/${device_id}/settings`);
  }

  async setGeoTracking(home_id, device_id, geoTrackingEnabled) {
    const settings = await this.getMobileDeviceSettings(home_id, device_id);
    settings['geoTrackingEnabled'] = geoTrackingEnabled;
    return this.apiCall(`/api/v2/homes/${home_id}/mobileDevices/${device_id}/settings`, 'PUT', settings);
  }

  async getZones(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones`);
  }

  async getZoneState(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/state`);
  }

  async getZoneCapabilities(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/capabilities`);
  }

  async getZoneOverlay(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/overlay`).catch(error => {
      if (error.response.status === 404) {
        return {};
      }

      throw error;
    });
  }

  async getZoneDayReport(home_id, zone_id, reportDate) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/dayReport?date=${reportDate}`);
  }

  async getTimeTables(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/schedule/activeTimetable`);
  }

  async getAwayConfiguration(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/awayConfiguration`);
  }

  async getTimeTable(home_id, zone_id, timetable_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/schedule/timetables/${timetable_id}/blocks`);
  }

  async clearZoneOverlay(home_id, zone_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/overlay`, 'DELETE');
  }

  async setZoneOverlay(home_id, zone_id, power, temperature, termination, tempUnit) {
    const zone_state = await this.getZoneState(home_id, zone_id);

    const config = {
      setting: zone_state.setting,
      termination: {},
    };

    if (power.toLowerCase() == 'on') {
      config.setting.power = 'ON';

      if (temperature && !isNaN(temperature)) {
        
        if(tempUnit.toLowerCase() === 'fahrenheit')
          temperature = (temperature - 32) * 5/9;
        
        config.setting.temperature = { celsius: temperature };
      
      } else {
      
        config.setting.temperature = null;
      
      }
      
      
    } else {
      
      config.setting.power = 'OFF';
      config.setting.temperature = null;
    
    }

    if (!isNaN(parseInt(termination))) {
      config.termination.type = 'TIMER';
      config.termination.durationInSeconds = termination;
    } else if (termination && termination.toLowerCase() == 'auto') {
      config.termination.type = 'TADO_MODE';
    } else if (termination && termination.toLowerCase() == 'next_time_block') {
      config.type = 'MANUAL';
      config.termination.typeSkillBasedApp = 'NEXT_TIME_BLOCK';
    } else {
      config.termination.type = 'MANUAL';
    }

    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/overlay`, 'PUT', config);
  }

  async setDeviceTemperatureOffset(device_id, temperatureOffset) {
    const config = {
      celsius: temperatureOffset,
    };

    return this.apiCall(`/api/v2/devices/${device_id}/temperatureOffset`, 'PUT', config);
  }

  async identifyDevice(device_id) {
    return this.apiCall(`/api/v2/devices/${device_id}/identify`, 'POST');
  }
  
  async getPresenceLock(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/state`);
  }

  async setPresenceLock(home_id, presence) {
    presence = presence.toUpperCase();

    if (!['HOME', 'AWAY', 'AUTO'].includes(presence)) {
      throw new Error(`Invalid presence "${presence}" must be "HOME", "AWAY", or "AUTO"`);
    }

    const method = presence == 'AUTO' ? 'DELETE' : 'PUT';
    const config = {
      homePresence: presence
    };

    return this.apiCall(`/api/v2/homes/${home_id}/presenceLock`, method, config);
  }

  async isAnyoneAtHome(home_id) {
    const devices = await this.getMobileDevices(home_id);

    for (const device of devices) {
      if (device.settings.geoTrackingEnabled && device.location && device.location.atHome) {
        return true;
      }
    }

    return false;
  }

  async updatePresence(home_id) {
    const isAnyoneAtHome = await this.isAnyoneAtHome(home_id);
    let isPresenceAtHome = await this.getState(home_id);
    isPresenceAtHome = isPresenceAtHome.presence === 'HOME';

    if (isAnyoneAtHome !== isPresenceAtHome) {
      return this.setPresenceLock(home_id, isAnyoneAtHome ? 'HOME' : 'AWAY');
    }
    else {
      return 'already up to date';
    }
  }

  async setWindowDetection(home_id, zone_id, enabled, timeout) {
    const config = {
      'enabled': enabled,
      'timeoutInSeconds': timeout,
    };
    return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/openWindowDetection`, 'PUT', config);
  }

  async setOpenWindowMode(home_id, zone_id, activate) {
    if (activate) {
      return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/state/openWindow/activate`, 'POST');
    } else {
      return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/state/openWindow`, 'DELETE');
    }
  }

  async getAirComfort(home_id) {
    return this.apiCall(`/api/v2/homes/${home_id}/airComfort`);
  }
  
  async getWeatherAirComfort(home_id, longitude, latitude) {
    let geoLocation = {
      longitude: longitude,
      latitude: latitude
    };
      
    if(!geoLocation.longitude || !geoLocation.latitude){
      const data = await this.getHome(home_id);
      geoLocation = data.geolocation;
    }

    return this.apiCall(`/v1/homes/${home_id}/airComfort`, 'GET', {}, geoLocation, 'https://acme.tado.com');
  }
  
  async setChildLock(serialNumber, state) {
    
    if (!serialNumber) {
      throw new Error('Cannot change child lock state. No serialNumber is given.');
    }
    
    return this.apiCall(`/api/v2/devices/${serialNumber}/childLock`, 'PUT', { 'childLockEnabled': state });
  
  }
  
  async switchAll(home_id, zones = []) {
    
    const postData = {
      overlays: []
    };
    
    zones.forEach(zone => {
    
      const zoneData = {
        room: zone.id,
        overlay: {
          setting: {
            power: zone.power || 'OFF',
            type: zone.type || 'HEATING'
          }
        },
        termination: {
          typeSkillBasedApp: zone.termination || 'MANUAL' 
        }
      };
      
      if(zone.maxTempInCelsius){
        zoneData.overlay.setting.temperature = {
          celsius: zone.maxTempInCelsius,
          fahrenheit: Math.round(((zone.maxTempInCelsius * 9 / 5 + 32) + Number.EPSILON) * 100) / 100
        };
      }
      
      if(zone.termination === 'TIMER'){
        zoneData.termination.durationInSeconds = zone.timer > 0
          ? zone.timer * 60
          : 1800;
      }
      
      postData.overlays.push(zoneData);
    
    });
    
    return this.apiCall(`/api/v2/homes/${home_id}/overlay`, 'POST', postData);
  
  }
  
  async resumeShedule(home_id, roomIds = []){
    
    if (!roomIds.length) {
      throw new Error('Can not resume shedule for zones, no room ids given!');
    }
  
    const params = {
      rooms: roomIds.toString()
    };
    
    return this.apiCall(`/api/v2/homes/${home_id}/overlay`, 'DELETE', {}, params);
  
  }
  
  async getRunningTime(home_id, time, from, to){  

    const  period = {
      aggregate: time || 'day',
      summary_only: true
    };
    
    if(from)
      period.from = from;
      
    if(to)
      period.to = to;
 
    return this.apiCall(`/v1/homes/${home_id}/runningTimes`, 'GET', {}, period, 'https://minder.tado.com', false);
 
  }
  
}

module.exports = Tado;
