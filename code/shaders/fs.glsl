#version 300 es

precision mediump float;

in vec3 fs_normal;
in vec2 fs_uv;
out vec4 outColor;

uniform sampler2D u_texture;

void main() {
  vec3 nNormal = normalize(fs_normal);
  outColor = texture(u_texture, fs_uv);
}