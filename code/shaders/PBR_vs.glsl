#version 300 es 

precision mediump float;
in vec4 in_position;
in vec3 in_normal;
in vec2 in_uv;

out vec3 fs_normal;
out vec2 fs_uv;
out vec3 radiance_direction;
out vec3 posLightSpace;

uniform mat4 u_matrix;
uniform mat4 u_normal_matrix;
uniform mat4 u_shadow_matrix;
uniform mat4 u_local_matrix;

void main() {
  // normals
  fs_normal = mat3(u_normal_matrix) * in_normal; 
  // albedo uv
  fs_uv = in_uv;
  // position in camera coordinates
  gl_Position = u_matrix * in_position; 
  // light
  radiance_direction = vec3(gl_Position);
  posLightSpace = vec3(u_shadow_matrix * ( u_local_matrix * in_position));
}