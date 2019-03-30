/**
 * v5
 *
 * @url https://github.com/SeydX/homebridge-tado-platform
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';
process.env.UV_THREADPOOL_SIZE = 128;
module.exports = function (homebridge) {
  let TadoPlatform = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-tado', 'TadoPlatform', TadoPlatform, true);
};
