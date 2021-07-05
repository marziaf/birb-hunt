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
uniform bool u_has_texture;
uniform sampler2D u_texture;

// BRDF
in vec3 radiance_direction; // omega_r
uniform vec3 u_light_direction; // lx
uniform vec3 u_light_color;
uniform float roughness;
uniform float metalness;
uniform vec3 specularColor;


void main() {
  vec3 nNormal = normalize(fs_normal);
  vec3 lightDir = normalize(u_light_direction);
  vec3 omega = normalize(radiance_direction);

  vec3 diffuse_color = vec3(texture(u_texture, fs_uv));

  // COOK-TORRANCE
  // Blinn reflection's half vector
  vec3 h = normalize(lightDir + omega);
  float nh = max(dot(h, nNormal), 0.0);
  float omh = max(dot(h, omega), 0.0);
  float omn = max(dot(omega, nNormal), 0.0);
  float ln = max(dot(lightDir, nNormal), 0.0);

  // Distribution term (roughness)
  float alpha = acos(nh);
  float D = roughness*roughness / min(( PI * pow( pow(nh, 2.0 ) * (roughness*roughness - 1.0) + 1.0 , 2.0 )), 1.0);

  // Fresnel term (incidence)
  vec3 F0 = metalness * specularColor + vec3(0.04, 0.04, 0.04) * (1.0 - metalness); 
  vec3 F = F0 + (1.0-F0) * pow( 1.0 - omh , 5.0);

  // Geometric term
  float k = (roughness+1.0) * (roughness+1.0) / 8.0;
  float G1 = omn / min(((1.0-k) * omn + k), 1.0);
  float G2 = ln / min(((1.0-k) * ln + k), 1.0);
  float G = G1 * G2;

  // Specular
  vec3 fSpecular = D * F * G / (4.0 * min(omh, 1.0));
  vec3 fDiffuse = ln * diffuse_color;

  vec3 PBR = (1.0 - F) * (1.0 - metalness) * fDiffuse + fSpecular;

  outColor = vec4(u_light_color * PBR, 1.0);
}