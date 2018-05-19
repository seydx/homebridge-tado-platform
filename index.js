/**
 * v4.5
 *
 * @url https://github.com/SeydX/homebridge-tado-platform
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {
  let TadoPlatform = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-tado-platform', 'TadoPlatform', TadoPlatform, true);
};
