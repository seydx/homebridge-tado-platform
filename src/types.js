'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    //const Service = hap.Service;

    /// /////////////////////////////////////////////////////////////////////////
    // AutoThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.AutoThermostats = function() {
      Characteristic.call(this, "State (auto)", "12edece0-36c8-427f-895c-3b88ea186388");
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
    Characteristic.AutoThermostats.UUID = "12edece0-36c8-427f-895c-3b88ea186388";
    
    /// /////////////////////////////////////////////////////////////////////////
    // ManualThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.ManualThermostats = function() {
      Characteristic.call(this, "State (manual)", "2be09385-4dc3-4438-9fee-b5b2e0642004");
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
    Characteristic.ManualThermostats.UUID = "2be09385-4dc3-4438-9fee-b5b2e0642004";
    
    /// /////////////////////////////////////////////////////////////////////////
    // OfflineThermostats Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.OfflineThermostats = function() {
      Characteristic.call(this, "State (off)", "93131984-615c-401b-84ac-54e22db492c6");
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
    Characteristic.OfflineThermostats.UUID = "93131984-615c-401b-84ac-54e22db492c6";
    
    /// /////////////////////////////////////////////////////////////////////////
    // DummSwitch Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DummySwitch = function() {
      Characteristic.call(this, 'Dummy Switch', 'a33a7443-ec88-4760-a48e-cff68f78e6d3');
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
