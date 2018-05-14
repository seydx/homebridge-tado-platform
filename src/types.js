'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    //const Service = hap.Service;

    /// /////////////////////////////////////////////////////////////////////////
    // AirPressure Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.AirPressure = function() {
      Characteristic.call(this, 'Air Pressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52');
      this.setProps({
        format: Characteristic.Formats.UINT16,
        unit: 'hPa',
        maxValue: 1100,
        minValue: 700,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.AirPressure, Characteristic);
    Characteristic.AirPressure.UUID = 'E863F10F-079E-48FF-8F27-9C2605A29F52';

    /// /////////////////////////////////////////////////////////////////////////
    // WeatherState Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.WeatherState = function() {
      Characteristic.call(this, 'Weather', '896f41ad-ef68-4d74-ae34-bd2c6266129f');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.WeatherState, Characteristic);
    Characteristic.WeatherState.UUID = '896f41ad-ef68-4d74-ae34-bd2c6266129f';

    /// /////////////////////////////////////////////////////////////////////////
    // Sunrise Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Sunrise = function() {
      Characteristic.call(this, 'Sunrise', '2a3f45d4-8191-4fc7-a102-359237c8a834');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Sunrise, Characteristic);
    Characteristic.Sunrise.UUID = '2a3f45d4-8191-4fc7-a102-359237c8a834';

    /// /////////////////////////////////////////////////////////////////////////
    // Sunset Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Sunset = function() {
      Characteristic.call(this, 'Sunset', 'f1dfeacb-2519-47d5-8608-cf453c2d7a74');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Sunset, Characteristic);
    Characteristic.Sunset.UUID = 'f1dfeacb-2519-47d5-8608-cf453c2d7a74';

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
    // DummSwitch Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DummySwitch = function() {
      Characteristic.call(this, 'Window Switch', 'a33a7443-ec88-4760-a48e-cff68f78e6d3');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DummySwitch, Characteristic);
    Characteristic.DummySwitch.UUID = 'a33a7443-ec88-4760-a48e-cff68f78e6d3';
    
    /// /////////////////////////////////////////////////////////////////////////
    // EveMotionLastActivation Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.EveMotionLastActivation = function() {
      Characteristic.call(this, 'Last Activation', 'E863F11A-079E-48FF-8F27-9C2605A29F52');
      this.setProps({
        format: Characteristic.Formats.UINT32,
        unit: Characteristic.Units.SECONDS,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.EveMotionLastActivation, Characteristic);
    Characteristic.EveMotionLastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DelayTimer Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DelayTimer = function () {
      Characteristic.call(this, 'Delay Timer', 'e36f5d74-3c26-4f77-871a-710b4b764765');
      this.setProps({
        format: Characteristic.Formats.INT,
        unit: Characteristic.Units.NONE,
        maxValue: 600, //10mins
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DelayTimer, Characteristic);
    Characteristic.DelayTimer.UUID = 'e36f5d74-3c26-4f77-871a-710b4b764765';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DelaySwitch Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DelaySwitch = function() {
      Characteristic.call(this, 'Delay Switch', '2676c66d-4f15-4a71-b5bd-3abe7704f9ac');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DelaySwitch, Characteristic);
    Characteristic.DelaySwitch.UUID = '2676c66d-4f15-4a71-b5bd-3abe7704f9ac';
    
    /// /////////////////////////////////////////////////////////////////////////
    // HeatValue Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.HeatValue = function () {
      Characteristic.call(this, 'Heat Value', 'd7f37b8e-4dca-4c13-8808-7f680dfeac75');
      this.setProps({
        format: Characteristic.Formats.INT,
        unit: Characteristic.Units.NONE,
        maxValue: 10,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.HeatValue, Characteristic);
    Characteristic.HeatValue.UUID = 'd7f37b8e-4dca-4c13-8808-7f680dfeac75';
    
    /// /////////////////////////////////////////////////////////////////////////
    // CoolValue Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.CoolValue = function () {
      Characteristic.call(this, 'Cool Value', 'b61ddf1e-64ae-49d4-ad36-8d89a976f1d9');
      this.setProps({
        format: Characteristic.Formats.INT,
        unit: Characteristic.Units.NONE,
        maxValue: 10,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.CoolValue, Characteristic);
    Characteristic.CoolValue.UUID = 'b61ddf1e-64ae-49d4-ad36-8d89a976f1d9';
    
  }
};
