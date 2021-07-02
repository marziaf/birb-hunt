var utils = {

    //**** MODEL UTILS
    // Function to load a 3D model in JSON format
    get_json: function(url, func) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", url, false); // if true == asynchronous...
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                //the file is loaded. Parse it as JSON and launch function
                func(JSON.parse(xmlHttp.responseText));
            }
        };
        //send the request
        xmlHttp.send();
    },

    //function to convert decimal value of colors 
    decimalToHex: function(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof(padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    },


    //*** SHADERS UTILS	
    /*Function to load a shader's code, compile it and return the handle to it
    Requires:
    	path to the shader's text (url)

    */

    createAndCompileShaders: async function(gl, paths) {
        var vs = await fetch(paths[0]).then(response => response.text()).then(data => { return data });
        var fs = await fetch(paths[1]).then(response => response.text()).then(data => { return data });
        var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, vs);
        var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, fs);

        var program = utils.createProgram(gl, vertexShader, fragmentShader);

        return program;
    },

    createShader: function(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        } else {
            console.log(gl.getShaderInfoLog(shader));
            if (type == gl.VERTEX_SHADER) {
                alert("ERROR IN VERTEX SHADER : \n" + gl.getShaderInfoLog(shader));
            }
            if (type == gl.FRAGMENT_SHADER) {
                alert("ERROR IN FRAGMENT SHADER : " + gl.getShaderInfoLog(shader));
            }
            let error = "could not compile shader:" + gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw error;
        }

    },

    createProgram: function(gl, vertexShader, fragmentShader) {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        } else {
            throw ("program filed to link:" + gl.getProgramInfoLog(program));
            console.log(gl.getProgramInfoLog(program)); // eslint-disable-line
            gl.deleteProgram(program);
            return undefined;
        }
    },

    loadFile: function(url, data, callback, errorCallback) {
        // Set up an synchronous request! Important!
        var request = new XMLHttpRequest();
        request.open('GET', url, false);

        // Hook the event that gets called as the request progresses
        request.onreadystatechange = function() {
            // If the request is "DONE" (completed or failed) and if we got HTTP status 200 (OK)


            if (request.readyState == 4 && request.status == 200) {
                callback(request.responseText, data)
                    //} else { // Failed
                    //	errorCallback(url);
            }

        };

        request.send(null);
    },

    loadFiles: function(urls, callback, errorCallback) {
        var numUrls = urls.length;
        var numComplete = 0;
        var result = [];

        // Callback for a single file
        function partialCallback(text, urlIndex) {
            result[urlIndex] = text;
            numComplete++;

            // When all files have downloaded
            if (numComplete == numUrls) {
                callback(result);
            }
        }

        for (var i = 0; i < numUrls; i++) {
            this.loadFile(urls[i], i, partialCallback, errorCallback);
        }
    },

    resizeCanvasToDisplaySize: function(canvas) {
        const expandFullScreen = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            //console.log(canvas.width + " " + window.innerWidth);

        };
        expandFullScreen();
        // Resize screen when the browser has triggered the resize event
        window.addEventListener('resize', expandFullScreen);
    },


    //*** MATH LIBRARY

    degToRad: function(angle) {
        return (angle * Math.PI / 180);
    },

    identityMatrix: function() {
        return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    },

    norm: function(v) {
        let norm = 0;
        for (let i = 0; i < v.length; i++) {
            norm += v[i] * v[i];
        }
        return norm;
    },

    normalize: function(v) {
        let n = utils.norm(v);
        if (n == 0) return v;
        for (let i = 0; i < v.length; i++) {
            v[i] /= n;
        }
        return v;
    },

    //requires as a parameter a 4x4 matrix (array of 16 values)
    invertMatrix: function(m) {

        var out = [];
        var inv = [];
        var det, i;

        inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
            m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];

        inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
            m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];

        inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
            m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];

        inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];

        inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
            m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];

        inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
            m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];

        inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
            m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];

        inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
            m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];

        inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
            m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];

        inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
            m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];

        inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
            m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];

        inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];

        inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
            m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];

        inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
            m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];

        inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];

        inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
            m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

        det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

        if (det == 0)
            return out = this.identityMatrix();

        det = 1.0 / det;

        for (i = 0; i < 16; i++) {
            out[i] = inv[i] * det;
        }

        return out;
    },

    transposeMatrix: function(m) {
        var out = [];

        var row, column, row_offset;

        row_offset = 0;
        for (row = 0; row < 4; ++row) {
            row_offset = row * 4;
            for (column = 0; column < 4; ++column) {
                out[row_offset + column] = m[row + column * 4];
            }
        }
        return out;
    },

    multiplyMatrices: function(m1, m2) {
        // Perform matrix product  { out = m1 * m2;}
        var out = [];

        var row, column, row_offset;

        row_offset = 0;
        for (row = 0; row < 4; ++row) {
            row_offset = row * 4;
            for (column = 0; column < 4; ++column) {
                out[row_offset + column] =
                    (m1[row_offset + 0] * m2[column + 0]) +
                    (m1[row_offset + 1] * m2[column + 4]) +
                    (m1[row_offset + 2] * m2[column + 8]) +
                    (m1[row_offset + 3] * m2[column + 12]);
            }
        }
        return out;
    },

    multiplyMatrixVector: function(m, v) {
        /* Mutiplies a matrix [m] by a vector [v] */

        var out = [];

        var row, row_offset;

        row_offset = 0;
        for (row = 0; row < 4; ++row) {
            row_offset = row * 4;

            out[row] =
                (m[row_offset + 0] * v[0]) +
                (m[row_offset + 1] * v[1]) +
                (m[row_offset + 2] * v[2]) +
                (m[row_offset + 3] * v[3]);

        }
        return out;
    },

    copy: function(src, dst) {
        dst = dst || new Float32Array(16);

        dst[0] = src[0];
        dst[1] = src[1];
        dst[2] = src[2];
        dst[3] = src[3];
        dst[4] = src[4];
        dst[5] = src[5];
        dst[6] = src[6];
        dst[7] = src[7];
        dst[8] = src[8];
        dst[9] = src[9];
        dst[10] = src[10];
        dst[11] = src[11];
        dst[12] = src[12];
        dst[13] = src[13];
        dst[14] = src[14];
        dst[15] = src[15];

        return dst;
    },







    //*** MODEL MATRIX OPERATIONS


    MakeTranslateMatrix: function(dx, dy, dz) {
        // Create a transform matrix for a translation of ({dx}, {dy}, {dz}).

        var out = this.identityMatrix();

        out[3] = dx;
        out[7] = dy;
        out[11] = dz;
        return out;
    },

    MakeRotateXMatrix: function(a) {
        // Create a transform matrix for a rotation of {a} along the X axis.

        var out = this.identityMatrix();

        var adeg = this.degToRad(a);
        var c = Math.cos(adeg);
        var s = Math.sin(adeg);

        out[5] = out[10] = c;
        out[6] = -s;
        out[9] = s;

        return out;
    },

    MakeRotateYMatrix: function(a) {
        // Create a transform matrix for a rotation of {a} along the Y axis.

        var out = this.identityMatrix();

        var adeg = this.degToRad(a);

        var c = Math.cos(adeg);
        var s = Math.sin(adeg);

        out[0] = out[10] = c;
        out[2] = s;
        out[8] = -s;

        return out;
    },

    MakeRotateZMatrix: function(a) {
        // Create a transform matrix for a rotation of {a} along the Z axis.

        var out = this.identityMatrix();

        var adeg = this.degToRad(a);
        var c = Math.cos(adeg);
        var s = Math.sin(adeg);

        out[0] = out[5] = c;
        out[4] = s;
        out[1] = -s;

        return out;
    },

    MakeScaleMatrix: function(s) {
        // Create a transform matrix for proportional scale

        var out = this.identityMatrix();

        out[0] = out[5] = out[10] = s;

        return out;
    },

    MakeScaleNuMatrix: function(sx, sy, sz) {
        // Create a scale matrix for a scale of ({sx}, {sy}, {sz}).

        var out = this.identityMatrix();
        out[0] = sx;
        out[5] = sy;
        out[10] = sz;
        return out;
    },

    MakeShearXMatrix: function(hy, hz) {
        // Create a scale matrix for a scale of ({sx}, {sy}, {sz}).

        var out = this.identityMatrix();
        out[4] = hy;
        out[8] = hz;
        return out;
    },

    MakeShearYMatrix: function(hx, hz) {
        // Create a scale matrix for a scale of ({sx}, {sy}, {sz}).

        var out = this.identityMatrix();
        out[1] = hx;
        out[9] = hz;
        return out;
    },

    MakeShearZMatrix: function(hx, hy) {
        // Create a scale matrix for a scale of ({sx}, {sy}, {sz}).

        var out = this.identityMatrix();
        out[2] = hx;
        out[6] = hy;
        return out;
    },


    //***Projection Matrix operations
    MakeWorld: function(tx, ty, tz, rx, ry, rz, s) {
        //Creates a world matrix for an object.

        var Rx = this.MakeRotateXMatrix(ry);
        var Ry = this.MakeRotateYMatrix(rx);
        var Rz = this.MakeRotateZMatrix(rz);
        var S = this.MakeScaleMatrix(s);
        var T = this.MakeTranslateMatrix(tx, ty, tz);

        let out = this.multiplyMatrices(Rz, S);
        out = this.multiplyMatrices(Ry, out);
        out = this.multiplyMatrices(Rx, out);
        out = this.multiplyMatrices(T, out);

        return out;
    },

    MakeView: function(cx, cy, cz, elev, ang) {
        // Creates in {out} a view matrix. The camera is centerd in ({cx}, {cy}, {cz}).
        // It looks {ang} degrees on y axis, and {elev} degrees on the x axis.

        var T = [];
        var Rx = [];
        var Ry = [];
        var tmp = [];
        var out = [];

        T = this.MakeTranslateMatrix(-cx, -cy, -cz);
        Rx = this.MakeRotateXMatrix(-elev);
        Ry = this.MakeRotateYMatrix(-ang);

        tmp = this.multiplyMatrices(Ry, T);
        out = this.multiplyMatrices(Rx, tmp);

        return out;
    },

    MakePerspective: function(fovy, a, n, f) {
        // Creates the perspective projection matrix. The matrix is returned.
        // {fovy} contains the vertical field-of-view in degrees. {a} is the aspect ratio.
        // {n} is the distance of the near plane, and {f} is the far plane.

        var perspective = this.identityMatrix();

        var halfFovyRad = this.degToRad(fovy / 2); // stores {fovy/2} in radiants
        var ct = 1.0 / Math.tan(halfFovyRad); // cotangent of {fov/2}

        perspective[0] = ct / a;
        perspective[5] = ct;
        perspective[10] = (f + n) / (n - f);
        perspective[11] = 2.0 * f * n / (n - f);
        perspective[14] = -1.0;
        perspective[15] = 0.0;

        return perspective;
    },

    MakeParallel: function(w, a, n, f) {
        // Creates the parallel projection matrix. The matrix is returned.
        // {w} contains the horizontal half-width in world units. {a} is the aspect ratio.
        // {n} is the distance of the near plane, and {f} is the far plane.

        var parallel = this.identityMatrix();

        parallel[0] = 1.0 / w;
        parallel[5] = a / w;
        parallel[10] = 2.0 / (n - f);
        parallel[11] = (n + f) / (n - f);

        return parallel;
    }
}
export { utils };