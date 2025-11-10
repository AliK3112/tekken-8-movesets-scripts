import struct
import os
import argparse
import ctypes
import binascii
import sys


# 
path_to_tkdata_pak = "D:\SteamLibrary\steamapps\common\TEKKEN 8\Polaris\Content\Binary\pak\\tkdata.bin"

# --- Masks ---
MASK64 = 0xFFFFFFFFFFFFFFFF
MASK32 = 0xFFFFFFFF

# --- Footer Decryption Constants ---
BNBPAK_MAGIC = 0x424e42696e50616b # "BNBkinPak" in ASCII
FOOTER_SIZE = 128 #  Guesses 
FOOTER_DEC_AREA_SIZE = 64 # Guesses 
# ---  Key Gen constants #
INITIAL_KEY_GEN_CONSTANTS = [
    0xadfb76c8, 0x7def1f1c, 0xa84b71e0, 0xd88448a2, 0x964f5b9e, 0x7ee2bc2c,
    0xa27d5221, 0xbb9fe67d, 0xad15269f, 0xec1a9785, 0x9bae2f45, 0xa4296896,
    0x275aa004, 0x37e22f31, 0x3803d4a7, 0xb3ae44f7
] # (Inputs to FUN_145973be0 at 0x145973be0)  


def print_hex_table(data: bytearray, bytes_per_row=16):
    for offset in range(0, len(data), bytes_per_row):
        row = data[offset:offset+bytes_per_row]
        # format each byte as two-digit hex
        hex_bytes = ' '.join(f"{b:02X}" for b in row)
        # print offset and row
        print(f"0x{offset:04X}: {hex_bytes}")


# --- Implementation of FUN_145973be0 at 0x145973be0 () ---
def generate_key_i(initial_constant_param2):
    magic_const = 0xedccfb96dca40fba
    param_2 = initial_constant_param2 & MASK64
    uVar5 = magic_const # Base value
    rotate_count = param_2 & 0x1f
    if rotate_count != 0:
        for _ in range(rotate_count):
            msb = (uVar5 >> 63) & 1
            uVar5 = ((uVar5 << 1) | msb) & MASK64

    term1 = uVar5 & 0xffffffffffffffe0 
    uVar5_combined = (term1 ^ param_2 ^ 0x1d) & MASK64

    uVar7 = 0
    uVar6 = uVar5_combined & MASK32
    uVar4 = 0 
    for _ in range(4): 
        uVar1 = magic_const 
        bVar2 = (uVar4 + 8) & 0xFF 
        if bVar2 != 0:
            for _ in range(bVar2):
                msb = (uVar1 >> 63) & 1
                uVar1 = ((uVar1 << 1) | msb) & MASK64

        uVar7 = (uVar7 ^ uVar1 ^ uVar6) & MASK64 
        uVar6 >>= 8 
        uVar4 += 8 

    # Final hash result, upper 32 bits of the 64-bit key
    hash_result_32 = uVar7 & MASK32
    if hash_result_32 == 0:
        hash_result_32 = 1

    # Combine with lower 32 bits of uVar5_combined
    result_64 = ((hash_result_32 << 32) | (uVar5_combined & MASK32)) & MASK64
    return result_64
    
# --- Implementation of FUN_145855e00 at 0x145855e00 (hash_func) ---
def hash_func(param_1_32):
    magic_const=0xedccfb96dca40fba; uVar2=0; uVar6=param_1_32&MASK32; uVar7=0
    for _ in range(4):
        uVar1=magic_const; bVar3=(uVar2+8)&0xFF
        if bVar3 != 0:
            for _ in range(bVar3):
                msb=(uVar1>>63)&1
                uVar1=((uVar1<<1)|msb)&MASK64
        uVar7=(uVar7^uVar1^uVar6)&MASK64; uVar5=(uVar2+8)&MASK32; uVar2=uVar5; uVar6>>=8
    hash_result_32=uVar7&MASK32
    if hash_result_32==0:hash_result_32=1
    return((hash_result_32<<32)|(param_1_32&MASK32))&MASK64
	
# Implementation of FUN_14585fa90 at 0x14585fa90 (get_xor_key_32bit) , in decompiled code it calls FUN_145b6a350 at 0x145b6a350 with a constant which is the pow() function
def get_xor_key_32bit(generated_key_i):
    uVar4 = generated_key_i & MASK64
    uVar1_hash_result = hash_func(uVar4 & MASK32)
    if uVar1_hash_result == uVar4:
        magic_const=0xedccfb96dca40fba
        uVar4_modified=(uVar4^0x1d)&MASK64
        uVar1_rotated=magic_const
        rotate_count=uVar4_modified&0x1f
        if rotate_count!=0:
            for _ in range(rotate_count):
                msb=(uVar1_rotated>>63)&1
                uVar1_rotated=((uVar1_rotated<<1)|msb)&MASK64
        term1=(uVar1_rotated&0xffffffffffffffe0)&MASK64
        numerator_base=(term1^uVar4_modified)&MASK64
        return numerator_base & MASK32
    else:
        return 0

def decrypt_footer_block(footer_data_in): # 

    # Decrypts first 64 bytes of the footer
    
    if len(footer_data_in) < FOOTER_DEC_AREA_SIZE + 1: return None
    footer_data = bytearray(footer_data_in)
    current_offset = 1
    
    generated_intermediate_keys = []
    print("Generating 16 keys for footer decryption")
    for i, constant in enumerate(INITIAL_KEY_GEN_CONSTANTS):
        gen_key = generate_key_i(constant)
        generated_intermediate_keys.append(gen_key)
        
    print("Decrypting footer block")
    keys_used_for_xor = []
    for i in range(16):
        intermediate_key = generated_intermediate_keys[i]
        key_32 = get_xor_key_32bit(intermediate_key) # Get the actual 32-bit XOR key

        keys_used_for_xor.append(key_32) # Store for debugging

        if current_offset + 3 > len(footer_data): return None

        key_byte0=key_32&0xFF
        key_byte1=(key_32>>8)&0xFF
        key_byte2=(key_32>>16)&0xFF
        key_byte3=(key_32>>24)&0xFF

        footer_data[current_offset-1] ^= key_byte0
        footer_data[current_offset]   ^= key_byte1
        footer_data[current_offset+1] ^= key_byte2
        footer_data[current_offset+2] ^= key_byte3
        current_offset += 4

    # print("[DEBUG] 32-bit keys used for XORing:")
    # print([f"0x{k:08X}" for k in keys_used_for_xor])

    try:
        decrypted_magic_bytes = footer_data[0:8]
        hex_string = ' '.join(f"{b:02x}" for b in decrypted_magic_bytes)
        decrypted_magic_int = struct.unpack('<Q', decrypted_magic_bytes)[0]
        print(f" Decrypted footer bytes at where BNBPak {hex_string}")
        if decrypted_magic_int == BNBPAK_MAGIC:
            print("BNBPak FOUND in decrypted footer")
            return bytes(footer_data)
        else:
            print(f"[ERROR] BNBPak NOT FOUND in decrypted footer. Instead Found: {decrypted_magic_int:#x}")
            hex_string = ' '.join(f"{b:02x}" for b in footer_data[:16])
            print(f" First 16 bytes of decrypted footer: {hex_string}")
            return None
    except Exception as e:
        print(f"[ERROR] Footer BNBPak check error: {e}")
        return None
    

if __name__ == "__main__":
    # path_to_tkdata_pak = input("Path to tk_data.pak: ")
    pak_file_path = path_to_tkdata_pak
    with open(pak_file_path, 'rb') as f_pak:
            pak_size = f_pak.seek(0, os.SEEK_END)
            if pak_size < FOOTER_SIZE: 
                print(f"[ERROR] PAK file too small ({pak_size})")
            footer_offset = pak_size - FOOTER_SIZE
            f_pak.seek(footer_offset)
            raw_footer_data = f_pak.read(FOOTER_SIZE)
    decrypted_footer = decrypt_footer_block(raw_footer_data)
    print_hex_table(decrypted_footer)