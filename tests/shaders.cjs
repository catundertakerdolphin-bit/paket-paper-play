const {spawnSync}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict'),load=require('./runtime.cjs');
const shaders=[...load({mobile:true}).shaders,...load().shaders];
const result=spawnSync('python',[path.join(__dirname,'shaders.py')],{input:JSON.stringify(shaders),encoding:'utf8',env:{...process.env,EGL_PLATFORM:'surfaceless'}});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');assert.equal(result.status,0,'All mobile and desktop GLSL programs must compile and link in OpenGL ES 3');
