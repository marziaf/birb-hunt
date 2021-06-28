#version 300 es

precision mediump float;

in vec3 sampleDir;
 
uniform samplerCube u_texture;
uniform mat4 inverseViewProjMatrix;

out vec4 outColor;
 
void main() {
    vec4 p = inverseViewProjMatrix*vec4(sampleDir, 1.0);
    
    // texture(sampler, coords)
    // sampler is the identifier of the texture object
    vec4 rgba = texture(u_texture, normalize(vec3(p.x, - p.y, p.z) / p.w));
    
    outColor = vec4(rgba.rgb, 1.0);
}