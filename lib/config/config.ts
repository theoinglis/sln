
const convict = require('convict'),
    path = require('path'),
    fs = require('fs');

const customConfigPath = path.resolve(process.cwd(), 'sln.json');

const schema = require('./schema.js');
const config = convict(schema);

try {
    var customConfigFile = fs.readFileSync(customConfigPath);
    config.loadFile(customConfigFile);
} catch(e) {
    console.log('No custom config loaded from', customConfigPath)
}
config.validate({strict: true});
export = config.getProperties();