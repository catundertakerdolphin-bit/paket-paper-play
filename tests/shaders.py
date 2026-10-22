"""Compile and link real GLES shaders without a browser or a preview server."""
import ctypes as C
import json
import sys

egl = C.CDLL('libEGL.so.1')
P, I, U = C.c_void_p, C.c_int, C.c_uint


def api(name, result, args):
    fn = getattr(egl, name)
    fn.restype, fn.argtypes = result, args
    return fn


display = api('eglGetDisplay', P, [P])(None)
assert api('eglInitialize', U, [P, C.POINTER(I), C.POINTER(I)])(display, C.byref(I()), C.byref(I())), 'EGL initialization failed'
assert api('eglBindAPI', U, [U])(0x30A0)
config, count = P(), I()
attrs = (I * 11)(0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3038)
assert api('eglChooseConfig', U, [P, C.POINTER(I), C.POINTER(P), I, C.POINTER(I)])(display, attrs, C.byref(config), 1, C.byref(count)) and count.value
surface = api('eglCreatePbufferSurface', P, [P, P, C.POINTER(I)])(display, config, (I * 5)(0x3057, 1, 0x3056, 1, 0x3038))
context = api('eglCreateContext', P, [P, P, P, C.POINTER(I)])(display, config, None, (I * 3)(0x3098, 3, 0x3038))
assert context and surface and api('eglMakeCurrent', U, [P, P, P, P])(display, surface, surface, context)
get_proc = api('eglGetProcAddress', P, [C.c_char_p])


def gl(name, result, *args):
    pointer = get_proc(name.encode())
    assert pointer, name
    return C.CFUNCTYPE(result, *args)(pointer)


create_shader = gl('glCreateShader', U, U)
shader_source = gl('glShaderSource', None, U, I, C.POINTER(C.c_char_p), C.POINTER(I))
compile_shader = gl('glCompileShader', None, U)
shader_iv = gl('glGetShaderiv', None, U, U, C.POINTER(I))
shader_log = gl('glGetShaderInfoLog', None, U, I, C.POINTER(I), C.c_char_p)
create_program = gl('glCreateProgram', U)
attach = gl('glAttachShader', None, U, U)
link = gl('glLinkProgram', None, U)
program_iv = gl('glGetProgramiv', None, U, U, C.POINTER(I))
program_log = gl('glGetProgramInfoLog', None, U, I, C.POINTER(I), C.c_char_p)
delete_shader = gl('glDeleteShader', None, U)
delete_program = gl('glDeleteProgram', None, U)

programs = json.load(sys.stdin)
try:
    for index, sources in enumerate(programs):
        program = create_program()
        for source, kind in zip(sources, [0x8B31, 0x8B30]):
            shader = create_shader(kind)
            shader_source(shader, 1, (C.c_char_p * 1)(source.encode()), None)
            compile_shader(shader)
            status, log = I(), C.create_string_buffer(8192)
            shader_iv(shader, 0x8B81, C.byref(status))
            shader_log(shader, 8192, None, log)
            assert status.value, f'Program {index}: {log.value.decode()}'
            attach(program, shader)
            delete_shader(shader)
        link(program)
        status, log = I(), C.create_string_buffer(8192)
        program_iv(program, 0x8B82, C.byref(status))
        program_log(program, 8192, None, log)
        assert status.value, f'Program {index}: {log.value.decode()}'
        delete_program(program)
    print(f'SHADER CHECKS PASSED: {len(programs)} mobile/desktop GLES 3 programs compiled and linked')
finally:
    api('eglMakeCurrent', U, [P, P, P, P])(display, None, None, None)
    api('eglDestroyContext', U, [P, P])(display, context)
    api('eglDestroySurface', U, [P, P])(display, surface)
    api('eglTerminate', U, [P])(display)
