#version 300 es

precision mediump float;
// Variables
in vec3 fs_normal;
in vec2 fs_uv;
out vec4 outColor;
// Matrices
uniform mat4 u_normal_matrix;
// Texture
uniform bool u_has_texture;
uniform sampler2D u_texture;

// Lambert reflection
uniform vec3 u_light_color;
uniform vec3 u_light_direction;
uniform vec3 u_diffuse_color;
// Ambient
uniform vec3 u_ambient_color;

void main() {
  vec3 nNormal = normalize(fs_normal);
  vec3 lighDir = normalize(u_light_direction);
  vec3 diffuse_color;
  if(u_has_texture) {
     diffuse_color = vec3(texture(u_texture, fs_uv));
  } else {
      diffuse_color = u_diffuse_color;
  }

  vec3 lambertColor = diffuse_color * u_light_color * dot(lighDir, nNormal);
  vec3 ambientColor = u_ambient_color * diffuse_color;
  vec4 color = vec4(lambertColor + ambientColor, 1.0);
  color = clamp(color, 0.0, 1.0);
  outColor = color;
}