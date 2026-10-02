import ExpoModulesCore

public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    // Marks a file or folder so iCloud and computer backups skip it, with everything inside.
    // The flag is stored on the item itself, so it holds for files added to the folder later.
    Function("exclude") { (url: URL) in
      var target = url
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try target.setResourceValues(values)
    }
  }
}
