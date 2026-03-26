package org.posterita.client.printing;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;


public class ImageConvertor 
{
	public static byte[] getCommands(String data)
	{
		try 
    	{
			byte[] imageData = Base64.decode(data.split(",")[1]);
			BufferedImage imageBuffer = ImageIO.read(new ByteArrayInputStream(imageData));
			
			byte[] commands = appendEpsonSlices(imageBuffer).getByteArray();
			
			return commands;
		} 
    	catch (IOException e) 
    	{
			e.printStackTrace();
		}
    	
    	return null;
	}

	public static void main(String[] args) throws IOException 
	{
		String data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQMAAAC6caSPAAAAAXNSR0IArs4c6QAAAAZQTFRF////AAAAVcLTfgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfeBxEHJSf200gcAAAC+klEQVR42u2bYW4rIQyELXEAjrRX3yNxgJVcGNtsEpL3D0cvGqfdVirfLxcYj70iDAaDwWBsCrXovx2nHP03PFvVJvZ9FVtxEUlF/NmX9rWnQXVAHRs/roLFhUgyMhKJ58hiZ/qzjb/UgclAejIvIt9BsMf6LsNWk4pMtvGTyFeRkcmRSAVX7bgbuRQi30EmCOa0XApSOY5A+XxaEtmIuFSw9f5p9f58VhdENiITHdINcqGndJx6Mu6j9k+JTWQfYvdRf8apB7kQ556nsn9fRH4QwRFregRCEQhWq/3D2Opnhsh2BLUuUnkes7hymSimTC4p+pJ9IglI6Pexx0CdtU1F0roSKUPEX0SSEQmVKF5eIYvYZQoBDw1PJBWR8O1cuPseEz/6qi4AkQxE4xNl1ayrTCS+0/xE9iMPvp26doN+QxrDiXiqd4lkICEV3E6FRWRnnssFu42IZCMhrX21hQs4RNE3Rx+RzchUcZFKMyNMV48dhuVFX+8xInsRNYNA4+w7p0NgrSFUPNdSihLZjMStBOlm5t1h515cSQYUIj+IeLWrZti6qY6aSqedfqG2IpKJ2L2HNsd0VG2x+0NmD5XF6iOyF4m4e7V271V3I8pqwRJJQOLSUxeK89qzTDZZs0gkATH57nNzgTRvpOswVN/pESKbEQ2n26pdl/D1lvDWgXg2uokkINFMPXzUtDPVO6kQ8LqoCyL7kbvg9alGXEvhcqOwQl9IiaQi+tDi9nTi9GvTJlq0ApEExKVCyDi7lmJo3ufmbLCRSCZijVS3VCWOPp8IwddiKhBJQNy1C0l9xgBVq7eMW8xxIr+C3MOTPngy2k8+2mAqcdn7RPYj97Dx87UXvdpqo0DlEiKpiEw/FVONqK6qO6oYN0XzSYlkI/GSkW+wB0FSfZfpayqJpCE+c2JehNRwVEXeDHYRyUPkuF9nCSvV/dSiLx1eIhnIBM9jDmpFD90K3g9XEpGdSEgFfXgtr/orJnjp+834HJHtCIPBYDAY/2X8ARaAb8SN81ozAAAAAElFTkSuQmCC";
    	    	
    	byte[] cmd = ImageConvertor.getCommands(data);
    	
    	    	
    	FileOutputStream fos = new FileOutputStream("/dev/usb/lp0");
    	BufferedOutputStream bos = new BufferedOutputStream(fos);   	
    	
    	bos.write(cmd);    	
    	bos.flush();
    	bos.close();

	}
	
	private static ByteArrayBuilder appendEpsonSlices(BufferedImage image) 
	{
		int dotDensity = 33;
		int width = image.getWidth();
		int height = image.getHeight();
		
		ByteArrayBuilder builder = new ByteArrayBuilder();
		
		builder.append(new byte[] {0x1B, 0x33, 24});
		
		
        int[] rgbPixels = image.getRGB(0, 0, width, height, null, 0, width);
        int p = 0;
        boolean[] pixels = new boolean[rgbPixels.length];
       /*
        * It makes most sense to have black pixels as 1's and white pixels
        * as zero's, however some printer manufacturers had this reversed
        * and used 0's for the black pixels.  EPL is a common language that
        * uses 0's for black pixels.
        * See also: https://support.zebra.com/cpws/docs/eltron/gw_command.htm
        */
        for (int rgbpixel : rgbPixels) 
        {
            pixels[p++] = isBlack(rgbpixel);
        }
        

      // OK. So, starting from x = 0, read 24 bits down and send that data
      // to the printer. The offset variable keeps track of our global 'y'
      // position in the image. For example, if we were drawing a bitmap
      // that is 48 pixels high, then this while loop will execute twice,
      // once for each pass of 24 dots. On the first pass, the offset is
      // 0, and on the second pass, the offset is 24. We keep making
      // these 24-dot stripes until we've execute past the height of the
      // bitmap.
      int offset = 0;

      while (offset < height) {
          // The third and fourth parameters to the bit image command are
          // 'nL' and 'nH'. The 'L' and the 'H' refer to 'low' and 'high', respectively.
          // All 'n' really is is the width of the image that we're about to draw.
          // Since the width can be greater than 255 dots, the parameter has to
          // be split across two bytes, which is why the documentation says the
          // width is 'nL' + ('nH' * 256).
          //builder.append(new byte[] {0x1B, 0x2A, 33, -128, 0});
          byte nL = (byte)((int)(width % 256));
          byte nH = (byte)((int)(width/256));
          builder.append(new byte[] {0x1B, 0x2A, (byte)dotDensity, nL , nH});

          for (int x = 0; x < width; ++x) {
              // Remember, 24 dots = 24 bits = 3 bytes.
              // The 'k' variable keeps track of which of those
              // three bytes that we're currently scribbling into.
              for (int k = 0; k < 3; ++k) {
                  byte slice = 0;

                  // A byte is 8 bits. The 'b' variable keeps track
                  // of which bit in the byte we're recording.
                  for (int b = 0; b < 8; ++b) {
                      // Calculate the y position that we're currently
                      // trying to draw. We take our offset, divide it
                      // by 8 so we're talking about the y offset in
                      // terms of bytes, add our current 'k' byte
                      // offset to that, multiple by 8 to get it in terms
                      // of bits again, and add our bit offset to it.
                      int y = (((offset / 8) + k) * 8) + b;

                      // Calculate the location of the pixel we want in the bit array.
                      // It'll be at (y * width) + x.
                      int i = (y * width) + x;

                      // If the image (or this stripe of the image)
                      // is shorter than 24 dots, pad with zero.
                      boolean v = false;
                      if (i < pixels.length) {
                          v = pixels[i];
                      }

                      // Finally, store our bit in the byte that we're currently
                      // scribbling to. Our current 'b' is actually the exact
                      // opposite of where we want it to be in the byte, so
                      // subtract it from 7, shift our bit into place in a temp
                      // byte, and OR it with the target byte to get it into there.
                      slice |= (byte) ((v ? 1 : 0) << (7 - b));
                  }

                  // Phew! Write the damn byte to the buffer
                  builder.append(new byte[] {slice});
              }
          }

          // We're done with this 24-dot high pass. Render a newline
          // to bump the print head down to the next line
          // and keep on trucking.
          offset += 24;          
          builder.append(new byte[] {10});
      }

      // Restore the line spacing to the default.
      builder.append(new byte[] {0x1B, 0x32});
      builder.append(new byte[] {10});
      
      return builder;

  }
	
	/**
     * Tests if a given pixel should be black. Multiple quantization algorythms
     * are available. The quantization method should be adjusted with
     * setQuantizationMethod. Should an invalied value be set as the
     * quantization method, CHECK_BLACK will be used
     *
     * @param rgbPixel the color of the pixel as defined in getRGB()
     * @return true if the pixel should be black, false otherwise
     */
    private static boolean isBlack(int rgbPixel) {
        Color color = new Color(rgbPixel, true);

        int r = color.getRed();
        int g = color.getGreen();
        int b = color.getBlue();
        int a = color.getAlpha();
        
        int lumaThreshold = 127;
        
        if (a < lumaThreshold) {
            return false;     // assume pixels that are less opaque than the luma threshold should be considered to be white
        }
        
        int luma = ((r * 299) + (g * 587) + (b * 114)) / 1000;      //luma formula
        return luma < lumaThreshold; 
       
    }

}
