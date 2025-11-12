"""
将PNG图标转换为RGBA格式的脚本
Tauri要求图标文件必须是32-bit RGBA格式（包含透明通道）
"""

import os
import sys
from PIL import Image


def convert_to_rgba(input_path, output_path=None):
    """
    将PNG图片转换为RGBA格式

    Args:
        input_path: 输入文件路径
        output_path: 输出文件路径，如果为None则覆盖原文件

    Returns:
        bool: 转换是否成功
    """
    try:
        # 打开图片
        with Image.open(input_path) as img:
            # 转换为RGBA格式
            rgba_img = img.convert("RGBA")

            # 设置输出路径
            if output_path is None:
                output_path = input_path

            # 保存为RGBA格式
            rgba_img.save(output_path, "PNG")

            print(f"成功转换: {input_path} -> RGBA格式")
            return True

    except Exception as e:
        print(f"转换失败: {input_path} - 错误: {str(e)}")
        return False


def main():
    """主函数"""
    # 获取icons目录路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, "icons")

    # 检查icons目录是否存在
    if not os.path.exists(icons_dir):
        print(f"错误: icons目录不存在: {icons_dir}")
        sys.exit(1)

    # 需要转换的PNG文件列表（根据tauri.conf.json中的配置）
    png_files = ["32x32.png", "128x128.png", "128x128@2x.png"]

    print("开始转换PNG图标为RGBA格式...")
    print("=" * 50)

    success_count = 0
    total_count = 0

    for png_file in png_files:
        input_path = os.path.join(icons_dir, png_file)

        if os.path.exists(input_path):
            total_count += 1
            print(f"\n处理文件: {png_file}")

            # 创建备份
            backup_path = input_path + ".backup"
            try:
                import shutil

                shutil.copy2(input_path, backup_path)
                print(f"   📋 已创建备份: {backup_path}")
            except Exception as e:
                print(f"   备份失败: {str(e)}")

            # 转换文件
            if convert_to_rgba(input_path):
                success_count += 1
        else:
            print(f"\n文件不存在: {input_path}")

    print("\n" + "=" * 50)
    print(f"📊 转换完成: {success_count}/{total_count} 个文件成功转换")

    if success_count == total_count and total_count > 0:
        print("\n所有PNG图标已成功转换为RGBA格式！")
        print("提示: 您现在可以将这些图标重新添加到tauri.conf.json中了")
    elif total_count == 0:
        print("\n没有找到需要转换的PNG文件")
    else:
        print(f"\n有 {total_count - success_count} 个文件转换失败，请检查错误信息")


if __name__ == "__main__":
    # 检查是否安装了Pillow库
    try:
        from PIL import Image
    except ImportError:
        print("错误: 需要安装Pillow库")
        print("请运行: pip install Pillow")
        sys.exit(1)

    main()
