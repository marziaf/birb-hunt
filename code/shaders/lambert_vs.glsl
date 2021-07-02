#version 300 es 

precision mediump float;
in vec4 in_position;
in vec3 in_normal;
in vec2 in_uv;

out vec3 fs_normal;
out vec2 fs_uv;

uniform mat4 u_matrix;
uniform mat4 u_normal_matrix;

void main() {
  fs_normal = mat3(u_normal_matrix) * in_normal;  
  fs_uv = in_uv;
  gl_Position = u_matrix * in_position;
}