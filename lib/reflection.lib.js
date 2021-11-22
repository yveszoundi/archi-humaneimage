var reflections = {
  "invokeMethodFromJar": function (jarPath, className, methodName, parameters) {
    let Class = Java.type("java.lang.Class")
    let ClassLoader = Java.type("java.lang.ClassLoader")
    let URLClassLoader = Java.type("java.net.URLClassLoader")
    let File = Java.type("java.io.File")
    let URL = Java.type("java.net.URL")
    let file = new File(jarPath)
    let urls = [ file.toURI().toURL() ]
    let child = new URLClassLoader(urls, ClassLoader.getSystemClassLoader())
    let result

    try {
      let classToLoad = Class.forName(className, true, child)
      let methods = classToLoad.getDeclaredMethods()
      let method

      for (let m of methods) {
        if (m.getName() == methodName) {
          method = m
        }
      }

      let instance = classToLoad.newInstance()
      result = method.invoke(instance, parameters)
    } catch (ex) {
      let currentEx = ex;
      while (currentEx.getCause() != null)
        currentEx = currentEx.getCause()
      
      throw new Error(currentEx.getMessage())
    }

    child = null

    return result
  }
}



