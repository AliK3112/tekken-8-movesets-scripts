import tkinter as tk
from tkinter import messagebox
import re

SEED = 0xEDCCFB96DCA40FBA & 0xFFFFFFFFFFFFFFFF

def encrypt_original_value(original_value: int) -> int:
    seed = SEED
    if (original_value & 0x1F) != 0:
        shift_amount = original_value & 0x1F
        for _ in range(shift_amount):
            seed = ((seed >> 63) + 2 * seed) & 0xFFFFFFFFFFFFFFFF
    
    bit_offset = 0
    masked_value = ((original_value ^ (seed & 0xFFFFFFE0) ^ 0x1D) & 0xFFFFFFF) & 0xFFFFFFFF
    temp_value = masked_value
    xor_accumulator = 0
    
    while bit_offset < 0x1C:
        temp_seed = SEED
        shift_bits = bit_offset + 4
        for _ in range(shift_bits):
            temp_seed = ((temp_seed >> 63) + 2 * temp_seed) & 0xFFFFFFFFFFFFFFFF
        
        bit_offset += 4
        xor_accumulator ^= (temp_value ^ temp_seed) & 0xF
        temp_value >>= 4
    
    checksum = xor_accumulator & 0xF
    if not checksum:
        checksum = 1
    
    return (masked_value + (checksum << 28)) & 0xFFFFFFFF

def decrypt_encrypted_value(encrypted_value: int) -> int:
    M = encrypted_value & 0xFFFFFFF  
    provided_checksum = (encrypted_value >> 28) & 0xF  

    xor_accumulator = 0
    temp_value = M
    bit_offset = 0
    while bit_offset < 0x1C:  
        temp_seed = SEED
        shift_bits = bit_offset + 4
        for _ in range(shift_bits):
            temp_seed = ((temp_seed >> 63) + 2 * temp_seed) & 0xFFFFFFFFFFFFFFFF
        xor_accumulator ^= (temp_value ^ temp_seed) & 0xF
        temp_value >>= 4
        bit_offset += 4
    computed_checksum = xor_accumulator & 0xF
    if computed_checksum == 0:
        computed_checksum = 1

    if computed_checksum != provided_checksum:
        raise ValueError("Checksum mismatch - decryption failed.")

    candidate_mod = (M & 0x1F) ^ 0x1D

    seed = SEED
    if candidate_mod != 0:
        for _ in range(candidate_mod):
            seed = ((seed >> 63) + 2 * seed) & 0xFFFFFFFFFFFFFFFF
    X = seed & 0xFFFFFFE0

    original_value = (M ^ 0x1D ^ X) & 0xFFFFFFF

    if (original_value & 0x1F) != candidate_mod:
        raise ValueError("Decryption inconsistency: recovered low 5 bits do not match.")

    return original_value

def validate_input(value: str) -> int:
    match = re.fullmatch(r'0x[0-9A-Fa-f]+|\d+', value)
    if not match:
        raise ValueError("Invalid input format. Enter a 32-bit integer in decimal or hex format.")
    
    num = int(value, 16 if value.lower().startswith("0x") else 10)
    if num > 0xFFFFFFFF:
        raise ValueError("Value exceeds 32-bit integer range.")
    
    return num

def update_output():
    try:
        input_value = input_field.get().strip()
        numeric_value = validate_input(input_value)
        encrypted_value = encrypt_original_value(numeric_value)
        
        if output_format.get() == "Decimal":
            output_var.set(str(encrypted_value))
        else:
            output_var.set(format(encrypted_value, "X"))  
    except ValueError as e:
        output_var.set(str(e))

def update_decryption():
    try:
        input_value = input_field.get().strip()
        numeric_value = validate_input(input_value)
        original_value = decrypt_encrypted_value(numeric_value)
        
        if output_format.get() == "Decimal":
            output_var.set(str(original_value))
        else:
            output_var.set(format(original_value, "X"))  
    except ValueError as e:
        output_var.set(str(e))

root = tk.Tk()
root.title("Encryptor")
root.geometry("300x150")
root.minsize(300, 150)
root.maxsize(450, 275)

frame = tk.Frame(root)
frame.pack(pady=10)

tk.Label(frame, text="Enter value:").grid(row=0, column=0)
input_field = tk.Entry(frame)
input_field.grid(row=0, column=1)

tk.Button(frame, text="Encrypt", command=update_output, width=10).grid(row=1, column=0, padx=5, pady=5)
tk.Button(frame, text="Decrypt", command=update_decryption, width=10).grid(row=1, column=1, padx=5, pady=5)

output_var = tk.StringVar()
output_field = tk.Entry(frame, textvariable=output_var, state="readonly", width=25)
output_field.grid(row=2, columnspan=2, pady=5)

output_format = tk.StringVar(value="Hexadecimal")
tk.Radiobutton(frame, text="Decimal", variable=output_format, value="Decimal", command=update_output).grid(row=3, column=0)
tk.Radiobutton(frame, text="Hexadecimal", variable=output_format, value="Hexadecimal", command=update_output).grid(row=3, column=1)

root.mainloop()
