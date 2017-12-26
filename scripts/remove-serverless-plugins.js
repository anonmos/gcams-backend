/**
 * Created by tim on 4/27/17.
 */
let YAML = require('yamljs')
let fs = require('fs')

let nativeObject = YAML.load('serverless.yml')

delete nativeObject.plugins
fs.writeFileSync('serverless.yml', YAML.stringify(nativeObject))
