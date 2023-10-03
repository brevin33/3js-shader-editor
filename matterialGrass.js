import * as THREE from 'three';

const Grass_VS = 
/*glsl*/`
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform float time;

attribute vec3 position;
attribute vec3 terrPosi;
attribute vec2 uv;
attribute float angle;
attribute vec3 normal;

varying vec2 vuv;

varying vec3 vecPos;

varying vec3 vecNormal;

varying float anglef;

vec4 quat_from_axis_angle(vec3 axis, float angle){ 
    vec4 qr;
    float half_angle = (angle * 0.5) * 3.14159 / 180.0;
    qr.x = axis.x * sin(half_angle);
    qr.y = axis.y * sin(half_angle);
    qr.z = axis.z * sin(half_angle);
    qr.w = cos(half_angle);
    return qr;
}

vec3 rotate_vertex_position(vec3 position, vec3 axis, float angle){

    vec4 q = quat_from_axis_angle(axis, angle);
    vec3 v = position.xyz;
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);

}

void main()
{
    vuv = uv;
    vec3 finalPosi = position + terrPosi;

    vec3 axis = vec3(0.0,1.0,0.0);

    finalPosi = rotate_vertex_position(finalPosi,axis,angle);

    if(finalPosi.y >= -0.9){
        finalPosi.x = ( finalPosi.x + sin( time / 500.0 * ( angle * 0.01 )  ) * 0.1 );
        finalPosi.z = ( finalPosi.z + cos( time / 500.0 * ( angle * 0.01 )  ) * 0.1 );
    }

    vecNormal = (viewMatrix * modelMatrix * vec4(position, 0.0)).xyz;
    vecNormal = normalize(vecNormal);

    anglef = angle;

    vec4 realPos = viewMatrix * modelMatrix * vec4(finalPosi, 1.0);

    vecPos = realPos.xyz;



    gl_Position = projectionMatrix * realPos;
}

`// glsl end


const Grass_FS = 
/*glsl*/`
precision mediump float;

varying vec2 vuv;

varying float anglef;

varying vec3 vecPos;

varying vec3 vecNormal;

struct PointLight {
    vec3 color;
    vec3 position; 
    float distance; 
    float decay;
  };
  
  struct DirectionalLight { 
      vec3 direction;
      vec3 color;
   };
  
  uniform DirectionalLight directionalLights;

  uniform float lightIntensity;
   
  uniform PointLight pointLights[NUM_POINT_LIGHTS];


float distSquared( vec3 A, vec3 B )
  {
  
      vec3 C = A - B;
      return dot( C, C );
  
  }

void main()
{
    vec3 c1 = vec3(.1411764705882353,.4745098039215686,.38823529411764707);
    float variance = .04;
    float sudoRand = mod(anglef * 9664.0, variance) - variance/2.0;
    c1.x = c1.x + sudoRand;
    c1.y = c1.y + sudoRand;
    c1.z = c1.z + sudoRand;
    c1 = c1 * 0.8;
    vec3 c2 = c1 * 1.25;
    vec3 finalColor =  mix( c2,c1, vuv.y );

    //lights
    vec4 addedLights = vec4(0.22,0.22,0.22,1.0);
    for(int l = 0; l < NUM_POINT_LIGHTS; l++) {
        float d = distSquared(pointLights[l].position,vecPos);
        if(pointLights[l].distance * pointLights[l].distance >= d - 5.0){
            vec3 lightDirection = normalize(vecPos - pointLights[l].position);
            addedLights.rgb += clamp(dot(-lightDirection,
                                    vecNormal), 0.02, 10.0)
                                    * pointLights[l].color
                                    * lightIntensity
                                    / (d*0.17 + 3.0 * pointLights[l].decay);
        }
    }

    gl_FragColor = vec4(finalColor,1) * addedLights;
}
` // glsl end

function GrassShaderMaterial(){

    const uniforms = {
        time: {value: 0},
    };

    const basicShaderMaterial = new THREE.RawShaderMaterial( {
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib['lights'],
            {
                lightIntensity: {type: 'f', value: .9},
                time: {value: 0},
                textureSampler: {type: 't', value: null}
            }
            ],),
        vertexShader: Grass_VS,
        fragmentShader: Grass_FS,
        lights: true,
        side: THREE.DoubleSide,
    });

    return basicShaderMaterial;
}

export{GrassShaderMaterial};