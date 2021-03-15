'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    const Service = hap.Service;

    /// /////////////////////////////////////////////////////////////////////////
    // AutoThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.AutoThermostats = function() {
      Characteristic.call(this, 'Mode Auto', '12edece0-36c8-427f-895c-3b88ea186388');
      this.setProps({
        format: Characteristic.Formats.INT,
        maxValue: 100,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.AutoThermostats, Characteristic);
    Characteristic.AutoThermostats.UUID = '12edece0-36c8-427f-895c-3b88ea186388';
    
    /// /////////////////////////////////////////////////////////////////////////
    // ManualThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.ManualThermostats = function() {
      Characteristic.call(this, 'Mode Manual', '2be09385-4dc3-4438-9fee-b5b2e0642004');
      this.setProps({
        format: Characteristic.Formats.INT,
        maxValue: 100,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.ManualThermostats, Characteristic);
    Characteristic.ManualThermostats.UUID = '2be09385-4dc3-4438-9fee-b5b2e0642004';
    
    /// /////////////////////////////////////////////////////////////////////////
    // OfflineThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OfflineThermostats = function() {
      Characteristic.call(this, 'Mode Off', '93131984-615c-401b-84ac-54e22db492c6');
      this.setProps({
        format: Characteristic.Formats.INT,
        maxValue: 100,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.OfflineThermostats, Characteristic);
    Characteristic.OfflineThermostats.UUID = '93131984-615c-401b-84ac-54e22db492c6';
    
    /// /////////////////////////////////////////////////////////////////////////
    // OverallHeatDay Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OverallHeatDay = function() {
      Characteristic.call(this, 'Activity Day', '43c89074-b70a-480c-8239-51697a9db445');
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        maxValue: 99999,
        minValue: 0,
        minStep: 0.01,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.OverallHeatDay, Characteristic);
    Characteristic.OverallHeatDay.UUID = '43c89074-b70a-480c-8239-51697a9db445';
    
    /// /////////////////////////////////////////////////////////////////////////
    // OverallHeatMonth Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OverallHeatMonth = function() {
      Characteristic.call(this, 'Activity Month', '1874332a-d7dd-4e45-9d65-a4baa6d11121');
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        maxValue: 99999,
        minValue: 0,
        minStep: 0.01,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.OverallHeatMonth, Characteristic);
    Characteristic.OverallHeatMonth.UUID = '1874332a-d7dd-4e45-9d65-a4baa6d11121';
    
    /// /////////////////////////////////////////////////////////////////////////
    // OverallHeatYear Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OverallHeatYear = function() {
      Characteristic.call(this, 'Activity Year', 'd105b9f7-afe7-44a2-9cbe-f079ba499733');
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        maxValue: 99999,
        minValue: 0,
        minStep: 0.01,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.OverallHeatYear, Characteristic);
    Characteristic.OverallHeatYear.UUID = 'd105b9f7-afe7-44a2-9cbe-f079ba499733';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DelaySwitch Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DelaySwitch = function() {
      Characteristic.call(this, 'Delay', 'b7c9db1a-e54e-4f4f-b3b4-17a19b2c4631');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DelaySwitch, Characteristic);
    Characteristic.DelaySwitch.UUID = 'b7c9db1a-e54e-4f4f-b3b4-17a19b2c4631';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DelayTimer Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DelayTimer = function() {
      Characteristic.call(this, 'Timer', '2e4eb630-62ab-41fe-bcc1-ea5c3cf98508');
      this.setProps({
        format: Characteristic.Formats.INT,
        maxValue: 120,
        minValue: 0,
        minStep: 10,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DelayTimer, Characteristic);
    Characteristic.DelayTimer.UUID = '2e4eb630-62ab-41fe-bcc1-ea5c3cf98508';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Thermostat Service
    /// ///////////////////////////////////////////////////////////////////////// 
    Service.Thermostat = function(displayName, subtype) {
      Service.call(this, displayName, '0000004A-0000-1000-8000-0026BB765291', subtype);
      
      // Required Characteristics
      this.addCharacteristic(Characteristic.CurrentHeatingCoolingState);
      this.addCharacteristic(Characteristic.TargetHeatingCoolingState);
      this.addCharacteristic(Characteristic.CurrentTemperature);
      this.addCharacteristic(Characteristic.TargetTemperature);
      this.addCharacteristic(Characteristic.TemperatureDisplayUnits);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.Name);
      this.addOptionalCharacteristic(Characteristic.AirQuality);
      this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
      this.addOptionalCharacteristic(Characteristic.TargetRelativeHumidity);
      this.addOptionalCharacteristic(Characteristic.CoolingThresholdTemperature);
      this.addOptionalCharacteristic(Characteristic.HeatingThresholdTemperature);
    
    };
    inherits(Service.Thermostat, Service);
    Service.Thermostat.UUID = '0000004A-0000-1000-8000-0026BB765291';
    
    /// /////////////////////////////////////////////////////////////////////////
    // HeaterCooler Service
    /// ///////////////////////////////////////////////////////////////////////// 
    Service.HeaterCooler = function(displayName, subtype) {
      Service.call(this, displayName, '000000BC-0000-1000-8000-0026BB765291', subtype);
      
      // Required Characteristics
      this.addCharacteristic(Characteristic.Active);
      this.addCharacteristic(Characteristic.CurrentHeaterCoolerState);
      this.addCharacteristic(Characteristic.TargetHeaterCoolerState);
      this.addCharacteristic(Characteristic.CurrentTemperature);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.Name);
      this.addOptionalCharacteristic(Characteristic.AirQuality);
      this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
      this.addOptionalCharacteristic(Characteristic.LockPhysicalControls);
      this.addOptionalCharacteristic(Characteristic.RotationSpeed);
      this.addOptionalCharacteristic(Characteristic.SwingMode);
      this.addOptionalCharacteristic(Characteristic.CoolingThresholdTemperature);
      this.addOptionalCharacteristic(Characteristic.HeatingThresholdTemperature);
      this.addOptionalCharacteristic(Characteristic.TemperatureDisplayUnits);
    
    };
    inherits(Service.HeaterCooler, Service);
    Service.HeaterCooler.UUID = '000000BC-0000-1000-8000-0026BB765291';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Faucet Service
    /// ///////////////////////////////////////////////////////////////////////// 
    Service.Faucet = function(displayName, subtype) {
      Service.call(this, displayName, '000000D7-0000-1000-8000-0026BB765291', subtype);
      
      // Required Characteristics
      this.addCharacteristic(Characteristic.Active);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.Name);
      this.addOptionalCharacteristic(Characteristic.ConfiguredName);
      this.addOptionalCharacteristic(Characteristic.IsConfigured);
      this.addOptionalCharacteristic(Characteristic.RemainingDuration);
      this.addOptionalCharacteristic(Characteristic.ServiceLabelIndex);
      this.addOptionalCharacteristic(Characteristic.SetDuration);
      this.addOptionalCharacteristic(Characteristic.StatusFault);
    
    };
    inherits(Service.Faucet, Service);
    Service.Faucet.UUID = '000000D7-0000-1000-8000-0026BB765291';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Valve Service
    /// ///////////////////////////////////////////////////////////////////////// 
    Service.Valve = function(displayName, subtype) {
      Service.call(this, displayName, '000000D0-0000-1000-8000-0026BB765291', subtype);
      
      // Required Characteristics
      this.addCharacteristic(Characteristic.Active);
      this.addCharacteristic(Characteristic.InUse);
      this.addCharacteristic(Characteristic.ValveType);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.Name);
      this.addOptionalCharacteristic(Characteristic.StatusFault);
      this.addOptionalCharacteristic(Characteristic.CurrentTemperature);
      this.addOptionalCharacteristic(Characteristic.CurrentHeaterCoolerState);
      this.addOptionalCharacteristic(Characteristic.TargetHeaterCoolerState);
      this.addOptionalCharacteristic(Characteristic.HeatingThresholdTemperature);
    
    };
    inherits(Service.Valve, Service);
    Service.Valve.UUID = '000000D0-0000-1000-8000-0026BB765291';
    
    /// /////////////////////////////////////////////////////////////////////////
    // AirQuality Service
    /// ///////////////////////////////////////////////////////////////////////// 
    Service.AirQuality = function(displayName, subtype) {
      Service.call(this, displayName, '0000008D-0000-1000-8000-0026BB765291', subtype);
      
      // Required Characteristics
      this.addCharacteristic(Characteristic.AirQuality);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.Name);
      
      this.addOptionalCharacteristic(Characteristic.NitrogenDioxideDensity);
      this.addOptionalCharacteristic(Characteristic.OzoneDensity);
      this.addOptionalCharacteristic(Characteristic.PM10Density);
      this.addOptionalCharacteristic(Characteristic.PM2_5Density);
      this.addOptionalCharacteristic(Characteristic.SulphurDioxideDensity);
      this.addOptionalCharacteristic(Characteristic.VOCDensity);
      this.addOptionalCharacteristic(Characteristic.CarbonMonoxideLevel);
      
      this.addOptionalCharacteristic(Characteristic.StatusActive);
      this.addOptionalCharacteristic(Characteristic.StatusFault);
      this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
      this.addOptionalCharacteristic(Characteristic.StatusTampered);
    
    };
    inherits(Service.AirQuality, Service);
    Service.AirQuality.UUID = '0000008D-0000-1000-8000-0026BB765291';
    
  }
};
