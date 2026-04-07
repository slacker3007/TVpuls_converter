import eel
import tkinter as tk
from tkinter import filedialog
import traceback

eel.init('web')

@eel.expose
def select_file_test():
    try:
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes('-topmost', 1)
        file_path = filedialog.askopenfilename(title="Select Video File")
        root.destroy()
        return file_path
    except Exception as e:
        return f"ERROR: {e}\n{traceback.format_exc()}"

if __name__ == '__main__':
    print("Testing select_file_test...")
    print(select_file_test())
