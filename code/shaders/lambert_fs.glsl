#version 300 es

precision mediump float;

in vec3 fs_normal;
in vec2 fs_uv;
out vec4 outColor;

uniform mat4 u_normal_matrix;

uniform bool u_has_texture;
uniform sampler2D u_texture;
uniform vec3 u_light_color;
uniform vec3 u_light_direction;
uniform vec3 u_diffuse_color;

void main() {
  vec3 nNormal = normalize(fs_normal);
  vec3 lighDir = normalize(u_light_direction);
  vec3 diffuse_color;
  if(u_has_texture) {
     diffuse_color = vec3(texture(u_texture, fs_uv));
  } else {
      diffuse_color = u_diffuse_color;
  }

  vec3 lambertColor = diffuse_color * u_light_color * dot(-lighDir, nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0), 1.0);
}