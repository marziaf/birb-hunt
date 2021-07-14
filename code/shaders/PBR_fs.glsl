#version 300 es 

precision mediump float;

#define PI radians(180.0)

// Variables
in vec3 fs_normal;
in vec2 fs_uv;
out vec4 outColor;
// Matrices
uniform mat4 u_normal_matrix;
// Texture
uniform sampler2D u_texture;
uniform sampler2D u_shadow_map;
// Shadows
in vec3 posLightSpace;

// BRDF
in vec3 radiance_direction; // omega_r
uniform vec3 u_light_direction; // lx
uniform vec3 u_light_color;
uniform float roughness;
uniform float metalness;
uniform vec3 specularColor;


vec3 getPBR(vec3 diffuse_color) {
  vec3 nNormal = normalize(fs_normal);
  vec3 lightDir = normalize(u_light_direction);
  vec3 omega = normalize(radiance_direction);

  // COOK-TORRANCE
  // Blinn reflection's half vector
  vec3 h = normalize(lightDir + omega);
  float nh = clamp(dot(h, nNormal), 0.0, 1.0);
  float omh = clamp(dot(h, omega), 0.0, 1.0);
  float omn = clamp(dot(omega, nNormal), 0.0, 1.0);
  float ln = clamp(dot(lightDir, nNormal), 0.0, 1.0);

  // Distribution term (roughness)
  float alpha = roughness;
  float D = alpha*alpha / (( PI * pow( pow(nh, 2.0 ) * (alpha*alpha - 1.0) + 1.0 , 2.0 )), 1.0);

  // Fresnel term (incidence)
  vec3 F0 = metalness * specularColor + vec3(0.04, 0.04, 0.04) * (1.0 - metalness); 
  vec3 F = F0 + (1.0-F0) * pow( 1.0 - omh , 5.0);

  // Geometric term
  float k = (alpha + 1.0) * (alpha + 1.0) / 8.0;
  float G1 = omn / ((1.0-k) * omn + k);
  float G2 = ln / ((1.0-k) * ln + k);
  float G = G1 * G2;

  // Specular
  vec3 fSpecular = D * F * G/(omh);
  vec3 fDiffuse = ln * diffuse_color;

  vec3 PBR = (1.0 - F) * (1.0 - metalness) * fDiffuse + fSpecular;
  return PBR;
}

float getShadows() {
  float shadowDepth = (texture(u_shadow_map, posLightSpace.xy).r);
  float shadow = (posLightSpace.z < shadowDepth) ? 1.0 : 0.0; 
  return shadowDepth;
}

void main() {
  vec3 diffuse_color = vec3(texture(u_texture, fs_uv));

  vec3 PBR = getPBR(diffuse_color);
  float shadows = getShadows();
 
  outColor = vec4(u_light_color * PBR, 1.0);
  //outColor = vec4(shadows, 0.0, 0.0, 1.0);
}