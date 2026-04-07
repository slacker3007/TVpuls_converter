import eel
import tkinter as tk
from tkinter import filedialog
import os
import subprocess
import threading

eel.init('.')

def get_video_files(folder_path):
    video_extensions = ('.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg')
    video_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(video_extensions):
                video_files.append(os.path.join(root, file))
    return video_files

@eel.expose
def select_file():
    code = "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.attributes('-topmost', True); root.withdraw(); print(filedialog.askopenfilename(title='Select Video File'))"
    result = subprocess.run(["python", "-c", code], stdout=subprocess.PIPE, text=True)
    return result.stdout.strip()

@eel.expose
def select_folder():
    code = "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.attributes('-topmost', True); root.withdraw(); print(filedialog.askdirectory(title='Select Folder'))"
    result = subprocess.run(["python", "-c", code], stdout=subprocess.PIPE, text=True)
    return result.stdout.strip()

def convert_file(input_path, output_filename):
    # Try copying first
    cmd_copy = [
        'ffmpeg', '-y', '-i', input_path, 
        '-c:v', 'copy', '-c:a', 'copy', 
        output_filename
    ]
    
    eel.log_message(f"Trying to copy stream for {os.path.basename(input_path)}...")
    
    # Run with subprocess
    result = subprocess.run(cmd_copy, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    if result.returncode == 0:
        eel.log_message(f"Successfully copied to {os.path.basename(output_filename)}")
        return True
    
    # If copy fails, fallback to encoding
    eel.log_message(f"Copy failed. Falling back to h264 encoding for {os.path.basename(input_path)}...")
    cmd_encode = [
        'ffmpeg', '-y', '-i', input_path, 
        '-c:v', 'libx264', '-c:a', 'aac', 
        output_filename
    ]
    
    result = subprocess.run(cmd_encode, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode == 0:
        eel.log_message(f"Successfully encoded to {os.path.basename(output_filename)}")
        return True
    else:
        eel.log_message(f"Error converting {os.path.basename(input_path)}: {result.stderr.decode('utf-8', errors='ignore')}")
        return False

@eel.expose
def start_conversion(target_path, is_folder):
    def run_conversion():
        try:
            if is_folder:
                files_to_convert = get_video_files(target_path)
                if not files_to_convert:
                    eel.log_message("No video files found in the selected folder.")
                    eel.conversion_finished()
                    return
                eel.log_message(f"Found {len(files_to_convert)} video files.")
            else:
                if not os.path.isfile(target_path):
                    eel.log_message("Invalid file selected.")
                    eel.conversion_finished()
                    return
                # Only check if it's not already MP4? Actually, even if MP4, we can re-copy. Let's exclude .mp4 maybe? 
                # Or just proceed.
                files_to_convert = [target_path]
                
            for index, input_path in enumerate(files_to_convert):
                # Calculate output path
                dir_name = os.path.dirname(input_path)
                base_name = os.path.basename(input_path)
                name, _ = os.path.splitext(base_name)
                
                # Output filename
                output_filename = os.path.join(dir_name, f"{name}_converted.mp4")
                
                # Check if output already exists and avoid infinite loop if converting in same folder
                if input_path == output_filename:
                    output_filename = os.path.join(dir_name, f"{name}_converted_2.mp4")
                
                eel.update_progress(index + 1, len(files_to_convert))
                convert_file(input_path, output_filename)
                
            eel.log_message("Conversion process finished!")
        except Exception as e:
            eel.log_message(f"An error occurred: {str(e)}")
        finally:
            eel.conversion_finished()

    # Run in a separate thread to avoid blocking the UI
    thread = threading.Thread(target=run_conversion)
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    eel.start('index.html', size=(800, 600))
