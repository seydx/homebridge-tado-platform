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
      Characteristic.call(this, 'State (auto)', '12edece0-36c8-427f-895c-3b88ea186388');
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
      Characteristic.call(this, 'State (manual)', '2be09385-4dc3-4438-9fee-b5b2e0642004');
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
      Characteristic.call(this, 'State (off)', '93131984-615c-401b-84ac-54e22db492c6');
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
    // OverallHeat Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OverallHeat = function() {
      Characteristic.call(this, 'Overall Heat', 'fca005bd-5cb5-4c14-a290-6e1a9980c436');
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        maxValue: 1000,
        minValue: 0,
        minStep: 0.01,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.OverallHeat, Characteristic);
    Characteristic.OverallHeat.UUID = 'fca005bd-5cb5-4c14-a290-6e1a9980c436';
    
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
    
  }
};
