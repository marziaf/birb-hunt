#version 300 es 

precision mediump float;
in vec4 in_position;

uniform mat4 matrix;

void main() {
  gl_Position = matrix * in_position;
}