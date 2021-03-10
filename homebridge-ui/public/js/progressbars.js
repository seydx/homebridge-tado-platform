/*global ProgressBar*/
/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "fetchDevicesBar" }]*/

const fetchDevicesBar = new ProgressBar.Circle('#fetchDevicesBar', {
  color: '#aaa',
  strokeWidth: 4,
  trailWidth: 1,
  easing: 'easeInOut',
  duration: 1400,
  text: {
    value: 'Initializing API..',
    style: {
      color: '#909090',
      position: 'absolute',
      left: '50%',
      top: '50%',
      padding: 0,
      margin: 0,
      fontFamily: 'Roboto,sans-serif',
      fontSize: '0.8rem',
      transform: {
        prefix: true,
        value: 'translate(-50%, -50%)'
      }
    },
    autoStyleContainer: false
  },
  from: { color: '#f5b104', width: 4 },
  to: { color: '#f5b104', width: 4 },
  step: function(state, circle) {
    circle.path.setAttribute('stroke', state.color);
    circle.path.setAttribute('stroke-width', state.width);
    let value = Math.round(circle.value() * 100);
    if(value === 100){
      circle.setText('Done!');
    } else if(value >= 80){
      circle.setText('Getting Zones..');
    } else if(value >= 60){
      circle.setText('Getting Mobile Devices..');
    } else if(value >= 40){
      circle.setText('Getting Homes..');
    } else if(value >= 20){
      circle.setText('Getting User Information..');
    } else {
      circle.setText('Initializing API..');
    }
  }
});